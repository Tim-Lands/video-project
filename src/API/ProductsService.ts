const API = require('../config/API')
const getSesionInfo = async(id:number)=>{
    try{
        const res = await API.get(`/api/sessions/${id}`)
        return res?.data
    }
    catch(err:any){
        console.log(err)
    }
}

 