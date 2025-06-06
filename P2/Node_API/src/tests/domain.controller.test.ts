import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { registerDomain, getUserDomains, deleteDomain, verifyDomainOwnership } from '../controllers/domain.controller';
import { database, firestore } from '../firebase';
import * as dns from 'dns/promises';

vi.mock('../firebase', () => ({
    database: {
        ref: vi.fn(() => ({
            once: vi.fn(),
            update: vi.fn(),
            remove: vi.fn()
        }))
    },
    firestore: {
        collection: vi.fn(() => ({
            doc: vi.fn(() => ({
                collection: vi.fn(() => ({
                    doc: vi.fn(),
                    get: vi.fn(),
                    where: vi.fn()
                })),
                get: vi.fn(),
                set: vi.fn(),
                delete: vi.fn()
            }))
        })),
        batch: vi.fn(() => ({
            delete: vi.fn(),
            commit: vi.fn()
        }))
    }
}));

vi.mock('dns/promises', () => ({
    resolveTxt: vi.fn()
}));

describe('Domain Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
        };
        vi.clearAllMocks();
    });

    describe('registerDomain', () => {
        it('debe registrar un dominio exitosamente', async () => {
            mockRequest = {
                body: { domain: 'test.com' },
                session: { user: 'testuser' }
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        doc: vi.fn().mockReturnValue({
                            set: vi.fn().mockResolvedValue(undefined),
                            get: vi.fn().mockResolvedValue({ exists: false })
                        })
                    })
                })
            } as any));

            vi.mocked(database.ref).mockImplementation(() => ({
                once: vi.fn().mockResolvedValue({ exists: () => false }),
                update: vi.fn().mockResolvedValue(undefined)
            } as any));

            await registerDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Domain registered successfully',
                    validation: expect.any(Object)
                })
            );
        });

        it('debe fallar si el dominio ya está registrado', async () => {
            mockRequest = {
                body: { domain: 'existing.com' },
                session: { user: 'testuser' }
            };

            const domainSnapshot = { exists: () => true };
            vi.mocked(database.ref).mockImplementation(() => ({
                once: vi.fn().mockResolvedValue(domainSnapshot)
            } as any));

            await registerDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'El dominio ya está registrado'
            });
        });



        it('debe fallar si el dominio no es válido', async () => {
            mockRequest = {
                body: { domain: 'invalid-domain' },
                session: { user: 'testuser' }
            };

            await registerDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Dominio inválido'
            });
        });
    });

    describe('getUserDomains', () => {
        it('debe obtener los dominios del usuario', async () => {
            mockRequest = {
                session: { user: 'testuser' }
            };

            const mockDomains = [
                { id: 'test.com', data: () => ({ validated: true }) }
            ];

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            empty: false,
                            forEach: (callback: (doc: any) => void) =>
                                mockDomains.forEach(callback)
                        })
                    })
                })
            } as any));

            await getUserDomains(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                domains: expect.any(Object)
            });
        });

        it('debe manejar el caso cuando el usuario no tiene dominios', async () => {
            mockRequest = {
                session: { user: 'testuser' }
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue({
                            empty: true,
                            forEach: () => { }
                        })
                    })
                })
            } as any));

            await getUserDomains(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({});
        });
    });

    describe('deleteDomain', () => {
        it('debe eliminar un dominio exitosamente', async () => {
            mockRequest = {
                params: { domain: 'test.com' },
                session: { user: 'testuser' }
            };

            const mockUserDomainRef = {
                get: vi.fn().mockResolvedValue({ exists: true }),
                collection: vi.fn().mockReturnValue({
                    get: vi.fn().mockResolvedValue({
                        forEach: vi.fn()
                    })
                })
            };

            const mockGlobalCollection = {
                get: vi.fn().mockResolvedValue({
                    forEach: vi.fn()
                })
            };

            vi.mocked(firestore.collection)
                .mockImplementationOnce(() => ({
                    doc: vi.fn().mockReturnValue({
                        collection: vi.fn().mockReturnValue({
                            doc: vi.fn().mockReturnValue(mockUserDomainRef)
                        })
                    })
                }) as any)
                .mockImplementationOnce(() => mockGlobalCollection as any)
                .mockImplementationOnce(() => mockGlobalCollection as any);

            vi.mocked(database.ref).mockImplementation(() => ({
                remove: vi.fn().mockResolvedValue(undefined)
            }) as any);

            await deleteDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Dominio y sus subdominios eliminados exitosamente",
                domain: 'test.com'
            });
        });

        it('debe retornar 401 si no hay sesión', async () => {
            mockRequest = {
                params: { domain: 'test.com' }
            };

            await deleteDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Unauthorized"
            });
        });

        it('debe retornar 400 si no se proporciona dominio', async () => {
            mockRequest = {
                params: {},
                session: { user: 'testuser' }
            };

            await deleteDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Dominio requerido"
            });
        });

        it('debe retornar 404 si el dominio no existe', async () => {
            mockRequest = {
                params: { domain: 'nonexistent.com' },
                session: { user: 'testuser' }
            };

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        doc: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({ exists: false })
                        })
                    })
                })
            }) as any);

            await deleteDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Dominio no encontrado"
            });
        });
    });

    describe('verifyDomainOwnership', () => {
        it('debe verificar la propiedad del dominio exitosamente', async () => {
            mockRequest = {
                session: { user: 'testuser' }
            };

            const mockDomains = [{
                id: 'test.com',
                data: () => ({
                    validation: {
                        subdomain: 'test-subdomain',
                        token: 'test-token'
                    },
                    validated: false
                }),
                ref: {
                    update: vi.fn().mockResolvedValue(undefined)
                }
            }];

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({
                                empty: false,
                                docs: mockDomains
                            })
                        })
                    })
                })
            } as any));

            vi.mocked(dns.resolveTxt).mockResolvedValue([['test-token']]);

            await verifyDomainOwnership(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Proceso de verificación completado'
                })
            );
        });

        it('debe fallar cuando no hay registros TXT', async () => {
            mockRequest = {
                session: { user: 'testuser' }
            };

            const mockDomains = [{
                id: 'test.com',
                data: () => ({
                    validation: {
                        subdomain: 'test-subdomain',
                        token: 'test-token'
                    },
                    validated: false
                }),
                ref: {
                    update: vi.fn().mockResolvedValue(undefined)
                }
            }];

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({
                                empty: false,
                                docs: mockDomains
                            })
                        })
                    })
                })
            } as any));

            vi.mocked(dns.resolveTxt).mockResolvedValue([]);

            await verifyDomainOwnership(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Proceso de verificación completado',
                    results: {
                        'test.com': {
                            verified: false,
                            error: 'No se encontró el registro TXT'
                        }
                    }
                })
            );
        });

        it('debe fallar cuando el token no coincide', async () => {
            mockRequest = {
                session: { user: 'testuser' }
            };

            const mockDomains = [{
                id: 'test.com',
                data: () => ({
                    validation: {
                        subdomain: 'test-subdomain',
                        token: 'correct-token'
                    },
                    validated: false
                }),
                ref: {
                    update: vi.fn().mockResolvedValue(undefined)
                }
            }];

            vi.mocked(firestore.collection).mockImplementation(() => ({
                doc: vi.fn().mockReturnValue({
                    collection: vi.fn().mockReturnValue({
                        where: vi.fn().mockReturnValue({
                            get: vi.fn().mockResolvedValue({
                                empty: false,
                                docs: mockDomains
                            })
                        })
                    })
                })
            } as any));

            vi.mocked(dns.resolveTxt).mockResolvedValue([['wrong-token']]);

            await verifyDomainOwnership(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Proceso de verificación completado',
                    results: {
                        'test.com': {
                            verified: false,
                            error: 'Token no coincide'
                        }
                    }
                })
            );
        });
    });
});