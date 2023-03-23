import Crypto from 'crypto';

import * as dotenv from 'dotenv'
dotenv.config()

const hashValue = (
    value: string, 
    salt?: string, 
    cycles: number = 500, 
    size: number = 64, 
    algo: string = 'sha256',
    salt_length: number = 32
): Promise<Error | {hash: string, salt: string}> => {
    let input_salt = salt ?? Crypto.randomBytes(salt_length).toString('hex');
    return new Promise((res, rej) => {
        Crypto.pbkdf2(value, input_salt, cycles, size, algo, (err, derivedKey) => {
            if(err) return rej(err);
            res({ hash: derivedKey.toString('hex'), salt: input_salt });
        });
    });
}

export const hashValidator = async (validator: string) => {
    let output = await hashValue(validator, process.env.BASE_SALT ?? 'SALT');
    if(output instanceof Error) return output;
    return output.hash;
}

export const generateSelectorAndValidator = () => {
    return {
        selector: Crypto.randomBytes(6).toString('hex'),
        validator: Crypto.randomBytes(32).toString('hex')
    }
}

export const daysToTimestamp = (days: number) => {
    return Date.now() + 1000 * 60 * 60 * 24 * days;
}