import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { registerCache } from '../controllers/cache.controller';
import { firestore } from '../firebase';
import validator from 'validator';
import countries from 'i18n-iso-countries';

vi.mock('../firebase', () => ({
    firestore: {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                set: vi.fn()
            }))
        }))
    }
}));



vi.mock('i18n-iso-countries', () => ({
    default: {
        isValid: vi.fn()
    },
    isValid: vi.fn()
}));

describe('Cache Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockRequest = {
            body: {}
        };
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        vi.clearAllMocks();
    });

    describe('registerCache', () => {
        it('debe retornar 400 si faltan país o IP', async () => {
            await registerCache(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "País e IP son requeridos."
            });
        });

        it('debe retornar 400 si el código de país no es válido', async () => {
            mockRequest.body = { country: 'INVALID', ip: '192.168.1.1' };
            vi.mocked(countries.isValid).mockReturnValue(false);

            await registerCache(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Código de país no válido."
            });
        });

        it('debe retornar 400 si la IP no es válida', async () => {
            mockRequest.body = { country: 'US', ip: 'invalid-ip' };
            vi.mocked(countries.isValid).mockReturnValue(true);

            await registerCache(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Dirección IP no válida."
            });
        });


        it('debe manejar errores del servidor', async () => {
            mockRequest.body = { country: 'US', ip: '192.168.1.1' };
            vi.mocked(countries.isValid).mockReturnValue(true);

            vi.mocked(firestore.collection).mockImplementation(() => {
                throw new Error('Database error');
            });

            await registerCache(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Internal server error"
            });
        });
    });
});