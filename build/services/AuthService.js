"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const API = require('../config/API');
const Auth = ({ token }) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield API.get('/api/me', {
            Headers: {
                Authorization: token
            }
        });
        if (res.status == 200)
            return true;
    }
    catch (err) {
        return false;
    }
});
module.exports = {
    Auth
};