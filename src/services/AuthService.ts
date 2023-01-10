const API = require('../config/API')
const Auth = async ({ token }: { token: string }) => {
    try {
        const res = await API.get('/api/me', {
            Headers: {
                Authorization: token
            }
        })
        if (res.status == 200)
            return true
    }
    catch (err) {
        return false
    }
}

module.exports = {
    Auth
}