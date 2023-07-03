import { Socket } from "socket.io";
import { authorizationService } from "./Authorization";
import { User } from "../resources/responses/meResponse";
import { SFUClient } from "./sfuClient";
import { getUserByToken } from "../API/Auth";
import {
	RoomResponse,
	SessionDate,
} from "../resources/responses/roomResponses";
import { UnavailableError } from "../errors/Unavailable";
import { SocketIOConnection } from "./socketIoConnection";
import { sessionApi } from "../API/Session";
import { BaseRoomHandler } from "./room/baseRoomHandelr";
import { getRoomHandler } from "./room/roomFactory";

class SocketHandler {
	rooms = {};
	sessionDates: { [key: string]: SessionDate } = {};
	roomName: string = "";
	sfuClient: SFUClient;
	roomHandler: BaseRoomHandler;
	token: string;
	socket: Socket;
	socketIOConnection: SocketIOConnection;
	user: User;
	room: RoomResponse;
	constructor(
		sfuClient: SFUClient,
		socket: Socket,
		token: string,
		roomHandler: BaseRoomHandler,
		roomName: string,
		user: User,
		room: RoomResponse
	) {
		this.sfuClient = sfuClient;
		this.socket = socket;
		this.token = token;
		this.socketIOConnection = SocketIOConnection.getSocketServer();
		this.roomHandler = roomHandler;
		this.roomName = roomName;
		this.user = user;
		this.room = room;
	}
	async handleConnection() {
		try {
			const rtpCapabilities = await this.joinOrCreateRoom(
				this.roomName,
				this.user
			);
			if (!rtpCapabilities) this.socket.disconnect();
			else this.socket.emit("rtpCapabilities", { rtpCapabilities });
			this.listen("disconnect", () => {
				this.onDisconnect();
			});

			this.listen(
				"createWebRtcTransport",
				async ({ consumer }, callback) => {
					console.log("listeneing on the createWebRtcTransport");
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
			this.listen(
				"transport-produce",
				async ({ kind, rtpParameters, appData }, callback) => {
					// call produce based on the prameters from the client
					const producer_id = await this.sfuClient.transportProduce(
						this.socket.id,
						kind,
						rtpParameters
					);
					const producersCount =
						await this.sfuClient.getProducersCount();
					// Send back to the client the Producer's id
					callback({
						id: producer_id,
						producersExist: producersCount > 1 ? true : false,
					});
				}
			);
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
			this.socket.disconnect();
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

	async joinOrCreateRoom(roomName: string, user: User) {
		let router1;
		if (user.is_instructor) {
			console.log("is instructor");
			router1 = await this.sfuClient.joinOrCreateRoom(
				roomName,
				this.socket.id
			);
			await sessionApi.markStarted(parseInt(roomName), this.token);
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
				...user,
			},
		};

		// get Router RTP Capabilities
		const rtpCapabilities = router1?.rtpCapabilities;

		// call callback from the client and send back the rtpCapabilities
		return rtpCapabilities;
	}

	async closeRouterOnDurationEnds(session_date_id: string) {
		const session_date = this.sessionDates[session_date_id];
		const end_date = new Date(
			`${session_date.session_date.toISOString().substring(0, 10)}T${
				session_date.from
			}`
		);
		end_date.setTime(end_date.getTime() + 60 * session_date.duration);
		const end_date_milliseconds = end_date.getMilliseconds();
		const current_date_milliseconds = new Date().getMilliseconds();
		const timeOut = end_date_milliseconds - current_date_milliseconds;
		setTimeout(
			() => this.closeRouterAndInformPeers(session_date_id),
			timeOut
		);
	}

	async closeRouterAndInformPeers(roomName: string) {
		this.socketIOConnection.emitToRoom(roomName, "conference_ended");
		this.sfuClient.closeRouter(roomName);
	}

	async muteUserAudio(user_id: number) {
		if (
			await this.roomHandler.canMuteUser({
				user: this.user,
				userToMuteId: user_id,
				room: this.room,
			})
		) {
			this.sfuClient.pauseAudioProducerByUserId(String(user_id));
		}
	}

	async muteUserVideo(user_id: number) {
		if (
			await this.roomHandler.canMuteUser({
				user: this.user,
				userToMuteId: user_id,
				room: this.room,
			})
		) {
			this.sfuClient.pauseVideoProducerByUserId(String(user_id));
		}
	}

	async listen(namespace: string, callback: (...args: any[]) => void) {
		this.socket.on(namespace, callback);
	}
}

export default SocketHandler;
