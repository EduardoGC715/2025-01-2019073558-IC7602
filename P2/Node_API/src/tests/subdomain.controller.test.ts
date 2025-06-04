import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { getAllSubdomains, registerSubdomain, updateSubdomain, deleteSubdomain, getSubdomainsByDomain, getSubdomainByName  } from '../controllers/subdomain.controller';
import { firestore, database } from '../firebase';
import * as validator from 'validator';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { WriteBatch } from 'firebase-admin/firestore';

vi.mock('../firebase', () => ({
  firestore: {
    collection: vi.fn(),
    batch: vi.fn()
  },
  database: {
    ref: vi.fn(() => ({
      update: vi.fn().mockResolvedValue(undefined)
    }))
  }
}));

describe('Subdomain Controller', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
        };
        vi.clearAllMocks();
    });

    describe('getAllSubdomains', () => {
        it('debe retornar 404 si no hay subdominios', async () => {
        const emptySnapshot = { empty: true, forEach: vi.fn() };
        vi.mocked(firestore.collection).mockReturnValue({
            get: vi.fn().mockResolvedValue(emptySnapshot)
        } as any);

        await getAllSubdomains(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'No subdomains found' });
        });

        it('debe retornar 200 con los subdominios existentes', async () => {
        const docs = [
            { id: 'sub1.domain.com', data: () => ({ destination: 'https://a.com' }) }
        ];
        const nonEmptySnapshot = {
            empty: false,
            forEach: (cb: any) => docs.forEach(cb)
        };
        vi.mocked(firestore.collection).mockReturnValue({
            get: vi.fn().mockResolvedValue(nonEmptySnapshot)
        } as any);

        await getAllSubdomains(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            'sub1.domain.com': { destination: 'https://a.com' }
        });
        });
    });

    describe('registerSubdomain', () => {
        it('debe retornar 401 si no hay sesión válida', async () => {
        mockRequest = {
            body: {
            subdomain: '',
            domain: 'example.com',
            cacheSize: 100,
            fileTypes: ['html'],
            ttl: 60000,
            replacementPolicy: 'LRU',
            authMethod: 'none',
            https: false,
            destination: 'example.com'
            }
        };

        await registerSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        it('debe retornar 400 si el destino no es FQDN o IP válida', async () => {
        mockRequest = {
            session: { user: 'testuser' },
            body: {
            subdomain: '',
            domain: 'example.com',
            cacheSize: 100,
            fileTypes: ['html'],
            ttl: 60000,
            replacementPolicy: 'LRU',
            authMethod: 'none',
            https: false,
            destination: 'invalid_destination'
            }
        };

        vi.spyOn(validator, 'isFQDN').mockReturnValue(false);
        vi.spyOn(validator, 'isIP').mockReturnValue(false);

        await registerSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Destino debe ser un nombre de dominio válido o una dirección IP.'
        });
        });

        it('debe crear subdominio exitosamente (authMethod: none)', async () => {
        mockRequest = {
            session: { user: 'testuser' },
            body: {
            subdomain: '',
            domain: 'example.com',
            cacheSize: 100,
            fileTypes: ['html'],
            ttl: 60000,
            replacementPolicy: 'LRU',
            authMethod: 'none',
            https: false,
            destination: 'example.com'
            }
        };

        vi.spyOn(validator, 'isFQDN').mockReturnValue(true);

        const mockDomainRef = {
            child: vi.fn(() => ({
            once: vi.fn().mockResolvedValue({ exists: () => false })
            }))
        };
        vi.mocked(database.ref).mockReturnValue(mockDomainRef as any);

        const mockBatch = {
            set: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined)
        } as unknown as WriteBatch;
        vi.mocked(firestore.batch).mockReturnValue(mockBatch as any);

        const mockColl = {
            doc: vi.fn(() => ({}) )
        };
        vi.mocked(firestore.collection).mockReturnValue({
            doc: vi.fn(() => ({}))
        } as any);

        await registerSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(201);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Subdomain creado exitosamente' });
        });
    });

    describe('updateSubdomain', () => {
        it('debe retornar 401 si no hay sesión válida', async () => {
        mockRequest = {
            body: {
            subdomain: '',
            domain: 'example.com',
            cacheSize: 100,
            fileTypes: ['html'],
            ttl: 60000,
            replacementPolicy: 'LRU',
            authMethod: 'none',
            https: false,
            destination: 'example.com'
            }
        };

        await updateSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        it('debe retornar 400 si el destino no es válido', async () => {
        mockRequest = {
            session: { user: 'testuser' },
            body: {
            subdomain: '',
            domain: 'example.com',
            cacheSize: 100,
            fileTypes: ['html'],
            ttl: 60000,
            replacementPolicy: 'LRU',
            authMethod: 'none',
            https: false,
            destination: 'invalid_destination'
            }
        };

        vi.spyOn(validator, 'isFQDN').mockReturnValue(false);
        vi.spyOn(validator, 'isIP').mockReturnValue(false);

        await updateSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            message: 'Destino debe ser un nombre de dominio válido o una dirección IP.'
        });
        });

        it('debe actualizar subdominio exitosamente (authMethod: none)', async () => {
        mockRequest = {
            session: { user: 'testuser' },
            body: {
            subdomain: '',
            domain: 'example.com',
            cacheSize: 100,
            fileTypes: ['html'],
            ttl: 60000,
            replacementPolicy: 'LRU',
            authMethod: 'none',
            https: false,
            destination: 'example.com'
            }
        };

        vi.spyOn(validator, 'isFQDN').mockReturnValue(true);
        vi.spyOn(validator, 'isIP').mockReturnValue(false);

        const mockDoc = { set: vi.fn().mockResolvedValue(undefined) };
        vi.mocked(firestore.collection).mockReturnValue({
            doc: vi.fn(() => mockDoc)
        } as any);

        await updateSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Subdomain creado exitosamente' });
        });
    });


    describe('deleteSubdomain', () => {
        it('debe retornar 401 si no hay sesión válida', async () => {
        mockRequest = {
            params: { domain: 'example.com', subdomain: 'sub' }
        };

        await deleteSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(401);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        it('debe retornar 400 si faltan parámetros domain o subdomain', async () => {
        mockRequest = {
            session: { user: 'testuser' },
            params: { domain: '', subdomain: '' }
        };

        await deleteSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Domain and subdomain are required' });
        });

        it('debe eliminar subdominio exitosamente', async () => {
        mockRequest = {
            session: { user: 'testuser' },
            params: { domain: 'example.com', subdomain: 'sub' }
        };

        const isWildcard = false;
        const cleanedSub = 'sub';
        const topDocId = 'sub.example.com';
        const fullDomain = 'sub.example.com';
        const flipped = 'com/example/sub';

        const mockDocRef = { delete: vi.fn() };
        const mockUserSubRef = { delete: vi.fn() };
        const mockBatch = {
            delete: vi.fn(),
            commit: vi.fn().mockResolvedValue(undefined)
        } as unknown as WriteBatch;

        vi.mocked(firestore.collection).mockImplementation((coll: string) => {
            if (coll === 'subdomains') {
            return { doc: vi.fn(() => mockDocRef) };
            }
            if (coll === 'users') {
            return {
                doc: vi.fn(() => ({
                collection: vi.fn(() => ({
                    doc: vi.fn(() => mockUserSubRef)
                }))
                }))
            };
            }
            return {} as any;
        });

        vi.mocked(firestore.batch).mockReturnValue(mockBatch as any);
        vi.mocked(database.ref).mockReturnValue({
            remove: vi.fn().mockResolvedValue(undefined)
        } as any);

        await deleteSubdomain(mockRequest as Request, mockResponse as Response);

        expect(mockBatch.delete).toHaveBeenCalledTimes(2);
        expect(mockBatch.commit).toHaveBeenCalled();
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Subdominio eliminado exitosamente' });
        });
    });

    describe('getSubdomainsByDomain', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;

        beforeEach(() => {
            mockRequest = {};
            mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
            };
            vi.clearAllMocks();
        });

        it('debe retornar 401 si no hay sesión válida', async () => {
            mockRequest = { query: { domain: 'example.com' } };

            await getSubdomainsByDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        it('debe retornar 400 si falta el parámetro domain', async () => {
            mockRequest = { session: { user: 'testuser' }, query: {} };

            await getSubdomainsByDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Domain is required' });
        });

        it('debe retornar 200 con subdominios regulares y con wildcard', async () => {
            mockRequest = { session: { user: 'testuser' }, query: { domain: 'example.com' } };

            const subDocs = [
            { id: 'a.example.com', data: () => ({ destination: 'https://a.com' }) },
            { id: 'other.com', data: () => ({ destination: 'https://other.com' }) }
            ];
            const wildcardDocs = [
            { id: 'b.example.com', data: () => ({ destination: 'https://b.com' }) }
            ];

            const subSnapshot = {
            forEach: (cb: any) => subDocs.forEach(cb)
            };
            const wildcardSnapshot = {
            forEach: (cb: any) => wildcardDocs.forEach(cb)
            };

            const collectionMock = vi
            .mocked(firestore.collection)
            .mockImplementation((coll: string) => {
                if (coll === 'subdomains') {
                return { get: vi.fn().mockResolvedValue(subSnapshot) };
                }
                if (coll === 'wildcards') {
                return { get: vi.fn().mockResolvedValue(wildcardSnapshot) };
                }
                return {} as any;
            });

            await getSubdomainsByDomain(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
            'a.example.com': { destination: 'https://a.com' },
            '*.b.example.com': { destination: 'https://b.com' }
            });
        });
    });

    describe('getSubdomainByName', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;

        beforeEach(() => {
            mockRequest = {};
            mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn()
            };
            vi.clearAllMocks();
        });

        it('debe retornar 401 si no hay sesión válida', async () => {
            mockRequest = { params: { domain: 'example.com', subdomainName: 'sub' } };

            await getSubdomainByName(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
        });

        it('debe retornar 400 si faltan params domain o subdomainName', async () => {
            mockRequest = { session: { user: 'testuser' }, params: { domain: '', subdomainName: '' } };

            await getSubdomainByName(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Dominio y subdominio requeridos' });
        });

        it('debe retornar 404 si no existe el subdominio', async () => {
            mockRequest = { session: { user: 'testuser' }, params: { domain: 'example.com', subdomainName: 'sub' } };

            const mockDocRef = { get: vi.fn().mockResolvedValue({ exists: false }) };
            vi.mocked(firestore.collection).mockReturnValue({ doc: vi.fn(() => mockDocRef) } as any);

            await getSubdomainByName(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Subdominio no encontrado' });
        });

        it('debe retornar 200 con datos del subdominio existente', async () => {
            mockRequest = { session: { user: 'testuser' }, params: { domain: 'example.com', subdomainName: 'sub' } };

            const dataObj = { destination: 'https://a.com' };
            const mockDocSnap = { exists: true, id: 'sub.example.com', data: () => dataObj };
            const mockDocRef = { get: vi.fn().mockResolvedValue(mockDocSnap) };
            vi.mocked(firestore.collection).mockReturnValue({ doc: vi.fn(() => mockDocRef) } as any);

            await getSubdomainByName(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ id: 'sub.example.com', ...dataObj });
        });
        });


});
