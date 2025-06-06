import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { getAllSubdomains, registerSubdomain, updateSubdomain, deleteSubdomain, getSubdomainsByDomain, getSubdomainByName } from '../controllers/subdomain.controller';
import { firestore, database } from '../firebase';


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

vi.mock('validator', () => ({
    isFQDN: vi.fn(),
    isIP: vi.fn()
}));

vi.mock('bcryptjs', () => ({
    hashSync: vi.fn(() => 'hashedPassword'),
    compareSync: vi.fn(() => true)
}));

vi.mock('crypto', () => ({
    randomBytes: vi.fn(() => Buffer.from('randomToken')),
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
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Se requiere un Dominio' });
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

            vi.mocked(firestore.collection).mockImplementation((coll: string) => {
                if (coll === 'subdomains') {
                    return { get: vi.fn().mockResolvedValue(subSnapshot) } as any;
                }
                if (coll === 'wildcards') {
                    return { get: vi.fn().mockResolvedValue(wildcardSnapshot) } as any;
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
            mockRequest = {
                session: { user: 'testuser' },
                params: { domain: '', subdomainName: '' }
            };

            await getSubdomainByName(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Dominio y subdominio requeridos'
            });
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