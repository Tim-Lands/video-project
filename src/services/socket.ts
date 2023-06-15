import { Socket } from "socket.io";
import { authorizationService } from "./Authorization";
import { User } from "../resources/responses/meResponse";
import { SFUClient } from "./sfuClient";
import { getUserByToken } from "../API/Auth";

class SocketHandler {
	rooms = {};
	sfuClient: SFUClient;
	token: string;
	socket: Socket;
	constructor(sfuClient: SFUClient, socket: Socket, token: string) {
		this.sfuClient = sfuClient;
		this.socket = socket;
		this.token = token;
	}
	async handleConnection() {
		try {
			console.log("handling connection");

			this.listen("disconnect", () => {
				this.onDisconnect();
			});

			this.listen("join_room", async ({ sessionDateId }, callback) => {
				// handle user joining a session
				console.log("rooom name is as following", sessionDateId);
				const res = await this.authorizeConnection(sessionDateId);
				const user = res?.user;
				if (!user) {
					console.log("unauthorized user");
					this.socket.disconnect();
					return;
				}

				const rtpCapabilities = await this.joinOrCreateRoom(
					sessionDateId,
					user
				);
				if (!rtpCapabilities) this.socket.disconnect();
				else this.socket.emit("rtpCapabilities", { rtpCapabilities });
			});

			this.listen(
				"createWebRtcTransport",
				async ({ consumer }, callback) => {
					const transport =
						await this.sfuClient.createWebRtcTransport(
							this.socket.id,
							consumer
						);
					callback({
						params: {
							id: transport.id,
							iceParameters: transport.iceParameters,
							iceCandidates: transport.iceCandidates,
							dtlsParameters: transport.dtlsParameters,
						},
					});
				}
			);

			this.listen("getProducers", async (callback) => {
				//return all producer transports
				const producers =
					await this.sfuClient.getProducersListForSocket(
						this.socket.id
					);
				// return the producer list back to the client
				callback(producers.map((producer) => producer.id));
			});

			// see client's this.socket.emit('transport-connect', ...)
			this.listen("transport-connect", async ({ dtlsParameters }) => {
				const transportData = await this.sfuClient.getTransport(
					this.socket.id
				);
				const transport = transportData.transport;
				transport.connect({ dtlsParameters });
			});

			// see client's this.socket.emit('transport-recv-connect', ...)
			this.listen(
				"transport-recv-connect",
				async ({ dtlsParameters, serverConsumerTransportId }) => {
					this.sfuClient.connectConsumerTransport(
						dtlsParameters,
						serverConsumerTransportId
					);
				}
			);

			this.listen(
				"consume",
				async (
					{
						rtpCapabilities,
						remoteProducerId,
						serverConsumerTransportId,
					},
					callback
				) => {
					try {
						const consumerData = await this.sfuClient.consume(
							this.socket.id,
							serverConsumerTransportId,
							rtpCapabilities,
							remoteProducerId
						);
						if (!consumerData) {
							console.log(
								"************************ cannot coonsume **************************"
							);
							return;
						}
						const { consumer, consumerTransport } = consumerData;
						consumer.on("transportclose", () => {
							console.log("transport close from consumer");
						});

						consumer.on("producerclose", () => {
							console.log("producer of consumer closed");
							this.socket.emit("producer-closed", {
								remoteProducerId,
							});
							consumerTransport.close();
							this.sfuClient.removeTransport(
								consumerTransport?.id
							);
							consumer.close();
							this.sfuClient.removeConsumer(consumer.id);
						});

						// from the consumer extract the following params
						// to send back to the Client
						const params = {
							id: consumer.id,
							producerId: remoteProducerId,
							kind: consumer.kind,
							rtpParameters: consumer.rtpParameters,
							serverConsumerId: consumer.id,
						};
						// send the parameters to the client
						console.log("before calling consumer callback");
						callback({ params });
					} catch (error: any) {
						console.log(error.message);
						callback({
							params: {
								error: error,
							},
						});
					}
				}
			);

			this.listen("consumer-resume", async ({ serverConsumerId }) => {
				await this.sfuClient.resumeConsume(serverConsumerId);
			});
		} catch (err: any) {
			console.log(err);
		}
	}

	async onDisconnect() {
		console.log("peer disconnected");
		this.sfuClient.removeConsumersOfSocket(this.socket.id);
		this.sfuClient.removeProducersOfSocket(this.socket.id);
		this.sfuClient.removeTransportsOfSocket(this.socket.id);

		const { roomName } = this.sfuClient.peers[this.socket.id];
		delete this.sfuClient.peers[this.socket.id];

		// remove this.socket from room
		this.sfuClient.removeSocketFromRoom(roomName, this.socket.id);
	}
	async authorizeConnection(sessionDateId: string) {
		console.log("entered in the authorizeConnection method");
		if (typeof sessionDateId != "string") return undefined;
		console.log("before calling authorize participant api");
		const user = await authorizationService.authorizeParticipant(
			parseInt(sessionDateId),
			this.token
		);
		console.log("authorize function has been executed successfully");
		return { user, roomName: sessionDateId };
	}

	async joinOrCreateRoom(roomName: string, user: User) {
		let router1;
		if (user.is_instructor) {
			console.log("is instructor");
			console.log(user);
			router1 = await this.sfuClient.joinOrCreateRoom(
				roomName,
				this.socket.id
			);
		} else {
			console.log("not instructor");
			router1 = await this.sfuClient.joinRoom(roomName, this.socket.id);
			console.log(router1);
		}

		this.sfuClient.peers[this.socket.id] = {
			socket: this.socket,
			roomName, // Name for the Router this Peer joined
			transports: [],
			producers: [],
			consumers: [],
			peerDetails: {
				name: "",
				isAdmin: false, // Is this Peer the Admin?
			},
		};

		// get Router RTP Capabilities
		const rtpCapabilities = router1?.rtpCapabilities;

		// call callback from the client and send back the rtpCapabilities
		return rtpCapabilities;
	}

	async listen(namespace: string, callback: (...args: any[]) => void) {
		this.socket.on(namespace, callback);
	}
}

export default SocketHandler;
