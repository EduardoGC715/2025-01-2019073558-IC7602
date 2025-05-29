import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { registerDomain, getUserDomains, deleteDomain, verifyDomainOwnership } from '../controllers/domain.controller';
import { database, firestore } from '../firebase';
import * as dns from 'dns/promises';

// Mock Firebase
vi.mock('../firebase', () => ({
    database: {
        ref: vi.fn(() => ({
            once: vi.fn(),
            update: vi.fn(),
            remove: vi.fn().mockResolvedValue(undefined)
        }))
    },
    firestore: {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                collection: vi.fn(() => ({
                    doc: vi.fn(() => ({
                        set: vi.fn().mockResolvedValue(undefined),
                        get: vi.fn(),
                        delete: vi.fn().mockResolvedValue(undefined)
                    })),
                    get: vi.fn()
                })),
                set: vi.fn().mockResolvedValue(undefined),
                get: vi.fn(),
                delete: vi.fn().mockResolvedValue(undefined)
            }))
        }))
    }
}));

// Mock DNS
vi.mock('dns/promises', () => ({
    resolveTxt: vi.fn()
}));

describe('Domain Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
            send: vi.fn()
        };
        vi.clearAllMocks();
    });

    describe('registerDomain', () => {
        it('debe registrar un dominio nuevo exitosamente', async () => {
            mockRequest = {
                body: { domain: 'example.com' },
                session: { user: 'testuser' }
            };

            const mockRef = {
                once: vi.fn().mockResolvedValue({ exists: () => false }),
                update: vi.fn().mockResolvedValue(undefined)
            };
            vi.mocked(database.ref).mockReturnValue(mockRef as any);

            const mockDocRef = {
                set: vi.fn().mockResolvedValue(undefined)
            };
            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    collection: () => ({
                        doc: () => mockDocRef
                    })
                })
            }) as any);

            await registerDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });

        it('debe retornar 400 si el dominio ya está registrado', async () => {
            mockRequest = {
                body: { domain: 'existing.com' },
                session: { user: 'testuser' }
            };

            const mockRef = {
                once: vi.fn().mockResolvedValue({ exists: () => true })
            };
            vi.mocked(database.ref).mockReturnValue(mockRef as any);

            await registerDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });

    describe('getUserDomains', () => {
        it('debe retornar los dominios del usuario', async () => {
            mockRequest = {
                session: { user: 'testuser' }
            };

            const mockDomains = [
                { id: 'example.com', data: () => ({ validated: true }) }
            ];

            const mockCollection = {
                get: vi.fn().mockResolvedValue({
                    empty: false,
                    forEach: (cb: any) => mockDomains.forEach(cb)
                })
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    collection: () => mockCollection
                })
            }) as any);

            await getUserDomains(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('deleteDomain', () => {
        it('debe eliminar un dominio exitosamente', async () => {
            mockRequest = {
                params: { domain: 'example.com' },
                session: { user: 'testuser' }
            };

            const mockDoc = {
                get: vi.fn().mockResolvedValue({ exists: true }),
                delete: vi.fn().mockResolvedValue(undefined)
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    collection: () => ({
                        doc: () => mockDoc
                    })
                })
            }) as any);

            vi.mocked(database.ref).mockReturnValue({
                remove: vi.fn().mockResolvedValue(undefined)
            } as any);

            await deleteDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });
    });

    describe('verifyDomainOwnership', () => {
        it('debe verificar el dominio exitosamente', async () => {
            const mockToken = 'test-token';
            mockRequest = {
                params: { domain: 'example.com' },
                session: { user: 'testuser' }
            };

            const mockDoc = {
                get: vi.fn().mockResolvedValue({
                    data: () => ({
                        validation: {
                            subdomain: 'test',
                            token: mockToken
                        }
                    })
                })
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    collection: () => ({
                        doc: () => mockDoc
                    })
                })
            }) as any);

            vi.mocked(dns.resolveTxt).mockResolvedValue([[mockToken]]);

            await verifyDomainOwnership(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it('debe retornar 400 si el token no coincide', async () => {
            mockRequest = {
                params: { domain: 'example.com' },
                session: { user: 'testuser' }
            };

            const mockDoc = {
                get: vi.fn().mockResolvedValue({
                    data: () => ({
                        validation: {
                            subdomain: 'test',
                            token: 'correct-token'
                        }
                    })
                })
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: () => ({
                    collection: () => ({
                        doc: () => mockDoc
                    })
                })
            }) as any);

            vi.mocked(dns.resolveTxt).mockResolvedValue([['wrong-token']]);

            await verifyDomainOwnership(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
        });
    });
});