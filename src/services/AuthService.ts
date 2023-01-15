const API = require('../config/API')
const authorizeToken = async ({ token }: { token: string }): Promise<Boolean> => {
    try {
        const res = await API.get('/api/me', {
            Headers: {
                Authorization: `Bearer ${token}`
            }
        })
        if (res.status == 200)
            return true
        return false
    }
    catch (err) {
        return false
    }
}

module.exports = {
    authorizeToken
}