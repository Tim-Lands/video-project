const API = require('../config/API')
export const authorizeToken = async ({ token }: { token: string }): Promise<any> => {
    try {
        const res = await API.get('/api/me', {
            Headers: {
                Authorization: `Bearer ${token}`
            }
        })
        if (res.status == 200)
            return res.data
        return false
    }
    catch (err) {
        return false
    }
}

