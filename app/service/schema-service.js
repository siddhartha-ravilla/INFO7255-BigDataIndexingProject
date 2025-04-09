import redis from './../redis-client.js';
import Ajv from "ajv";
import planSchema from '../model/schema.js';
import crypto from 'crypto';

const ajv = new Ajv();
const validate = ajv.compile(planSchema);

/**
 * Fetch all existing data.
 * @returns 
 */
export const getAllUsecaseData = async (objectId) => {
    const keys = await redis.keys('*');
    if (!keys.length) return [];
    
    const usecaseData = await Promise.all(keys.map(async (key) => {
        const data = await redis.get(key);
        return JSON.parse(data);
    }));

    return usecaseData;
    }

/**
 * Add a new use case data entry.
 * @param {*} usecaseData 
 * @returns 
 */
export const addUsecaseData = async (usecaseData) => {
    if (!validate(usecaseData)) throw new Error("Invalid JSON format");
    const { objectId } = usecaseData;
    if (!objectId) throw new Error('objectId is required');

    const etag = crypto.createHash('md5').update(JSON.stringify(usecaseData)).digest('hex');
    usecaseData.etag = etag;

    await redis.set(objectId, JSON.stringify(usecaseData));
    return usecaseData;
}


// /**
//  * Delete all use case data.
//  * @returns 
//  */
// export const deleteUsecaseData = async () => {
//     const keys = await redis.keys('*');
//     if (!keys.length) return null;

//     await redis.del(...keys);
//     return true;
// }

/**
 * Delete data by ID.
 * @param {*} id 
 * @returns 
 */
export const deleteUsecaseDataById = async (id) => {
    const exists = await redis.exists(id);
    if (!exists) return null;

    await redis.del(id);
    return true;
}

/**
 * Fetch all existing data by id
 * @param {*} id 
 * @returns 
 */
export const getDataById = async (id, etag) => {
    const data = await redis.get(id);
    if (!data) return { status: 404 };
    const parsedData = JSON.parse(data);
    const storedEtag = parsedData.etag;
    if (!etag) {
        return { status: 200, data: parsedData, etag: storedEtag };
    }
    if (etag === storedEtag) {
        return { status: 304 };
    }
        return { status: 200, data: parsedData, etag: storedEtag };
}


export const updateUsecaseData = async (id, linkedPlanServices, ifMatch) => {
    const storedData = await redis.get(id);
    if (!storedData) {
        throw new Error("Not Found: Object does not exist");
    }

    const existingData = JSON.parse(storedData);
    if (existingData.etag !== ifMatch) {
        throw new Error("Precondition Failed: ETag does not match");
    }

    //existingData.linkedPlanServices.push(...linkedPlanServices);
    const updatedData = { ...existingData };
    const newLinkedPlanServices  = [...existingData.linkedPlanServices];

    linkedPlanServices.forEach((newService) => {
        const existingService = existingData.linkedPlanServices.find(service => service.id === newService.id);

        // Append only if the service has changed
        if (!existingService || JSON.stringify(existingService) !== JSON.stringify(newService)) {
            newLinkedPlanServices.push(newService);
        }
    });
    updatedData.linkedPlanServices = newLinkedPlanServices;
    updatedData.etag = crypto.createHash('md5').update(JSON.stringify(updatedData)).digest('hex');

    await redis.set(id, JSON.stringify(updatedData));
    return updatedData;
};