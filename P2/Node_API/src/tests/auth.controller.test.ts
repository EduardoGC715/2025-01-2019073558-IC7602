import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { registerUser, loginUser, loginSubdomainUser, loginSubdomainApiKey, logoutUser, validateSubdomainSession } from '../controllers/auth.controller';
import { firestore } from '../firebase';
import bcrypt from 'bcryptjs';

// Mock modules
vi.mock('../firebase', () => ({
    firestore: {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                get: vi.fn(),
                set: vi.fn(),
                delete: vi.fn()
            })),
            add: vi.fn(() => ({ id: 'test-session-id' }))
        }))
    }
}));

vi.mock('bcryptjs', () => ({
    default: {
        genSaltSync: vi.fn(() => 'salt'),
        hashSync: vi.fn(() => 'hashedPassword'),
        compareSync: vi.fn()
    }
}));

vi.mock('jsonwebtoken', () => ({
    default: {
        sign: vi.fn(() => 'mock.jwt.token')
    }
}));

describe('Auth Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            cookie: vi.fn(),
            clearCookie: vi.fn(),
            send: vi.fn()
        };
        vi.clearAllMocks();
    });

    describe('registerUser', () => {
        it('debe registrar usuario', async () => {
            mockRequest = {
                body: { username: 'testuser', password: 'password123' }
            };

            const docGet = vi.fn().mockResolvedValue({ exists: false });
            const docSet = vi.fn().mockResolvedValue(undefined);

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    get: docGet,
                    set: docSet
                }),
                add: vi.fn().mockResolvedValue({ id: 'test-session-id' })
            } as any));

            await registerUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Usuario registrado exitosamente',
                    token: expect.any(String)
                })
            );
        });

        it('retorna 400 si ya existe', async () => {
            mockRequest = {
                body: { username: 'existinguser', password: 'password123' }
            };

            const docGet = vi.fn().mockResolvedValue({ exists: true });

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    get: docGet
                })
            } as any));

            await registerUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'El usuario ya existe.'
            });
        });
    });

    describe('loginUser', () => {
        it('debe hacer login con los credenciales', async () => {
            mockRequest = {
                body: { username: 'testuser', password: 'correctpassword' }
            };

            const userData = { password: 'hashedPassword' };
            const docGet = vi.fn().mockResolvedValue({
                exists: true,
                data: () => userData
            });

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    get: docGet
                }),
                add: vi.fn().mockResolvedValue({ id: 'test-session-id' })
            } as any));

            vi.mocked(bcrypt.compareSync).mockReturnValue(true);

            await loginUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    token: expect.any(String)
                })
            );
        });
    });

    describe('logoutUser', () => {
        it('se debe cerrar sesión exitosamente', async () => {
            // Create a valid JWT token format
            const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJ0ZXN0LXNlc3Npb24taWQifQ.signature';

            mockRequest = {
                cookies: { token: validToken }
            };

            const sessionDelete = vi.fn().mockResolvedValue(undefined);

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    delete: sessionDelete
                })
            } as any));

            await logoutUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.clearCookie).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Session removed'
            });
        });
    });

    describe('validateSubdomainSession', () => {
        it('debe validar la sesión correctamente', async () => {
            mockRequest = {
                session: { userId: '123' }
            };

            await validateSubdomainSession(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.send).toHaveBeenCalledWith('OK');
        });

        it('debe retornar 401 si no existe la sesión', async () => {
            mockRequest = {
                session: undefined
            };

            await validateSubdomainSession(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Unauthorized'
            });
        });
    });
});