const API = require('../config/API')
const getSesionDateInfo = async(id:number)=>{
    try{
        const res = await API.get(`/api/sessions/${id}`)
        return res?.data
    }
    catch(err:any){
        console.log(err)
    }
}

 