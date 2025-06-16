import SQLite from 'react-native-sqlite-storage';
import { User, Store, Assembler, Service, Application, Message, Rating, BankAccount } from '../types/database';

// Configuração do SQLite
SQLite.enablePromise(true);
SQLite.DEBUG(false);

export class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: 'amigomontador.db',
        location: 'default',
        createFromLocation: '~www/amigomontador.db',
      });

      await this.createTables();
      console.log('Banco de dados inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar banco de dados:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      // Tabela de usuários
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        birthDate TEXT NOT NULL,
        userType TEXT NOT NULL,
        profilePhotoUrl TEXT NOT NULL,
        profileData TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tabela de lojas
      `CREATE TABLE IF NOT EXISTS stores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        name TEXT NOT NULL,
        documentType TEXT NOT NULL,
        documentNumber TEXT NOT NULL,
        cnpj TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        phone TEXT,
        logoUrl TEXT NOT NULL,
        materialTypes TEXT,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`,

      // Tabela de montadores
      `CREATE TABLE IF NOT EXISTS assemblers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        address TEXT NOT NULL,
        addressNumber TEXT,
        neighborhood TEXT,
        cep TEXT,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        specialties TEXT,
        technicalAssistance INTEGER DEFAULT 0,
        experience TEXT,
        workRadius INTEGER DEFAULT 20,
        rating INTEGER,
        documents TEXT,
        documentType TEXT,
        documentNumber TEXT,
        rgFrontUrl TEXT NOT NULL,
        rgBackUrl TEXT NOT NULL,
        proofOfAddressUrl TEXT NOT NULL,
        certificatesUrls TEXT,
        experienceYears INTEGER DEFAULT 0,
        serviceTypes TEXT,
        availability TEXT,
        hasOwnTools INTEGER DEFAULT 1,
        professionalDescription TEXT,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`,

      // Tabela de serviços
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        storeId INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        address TEXT,
        addressNumber TEXT,
        cep TEXT,
        latitude TEXT NOT NULL,
        longitude TEXT NOT NULL,
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        price TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        materialType TEXT NOT NULL,
        projectFiles TEXT NOT NULL,
        paymentReference TEXT,
        paymentStatus TEXT DEFAULT 'pending',
        paymentProof TEXT,
        ratingRequired INTEGER DEFAULT 0,
        storeRatingCompleted INTEGER DEFAULT 0,
        assemblerRatingCompleted INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (storeId) REFERENCES stores (id)
      )`,

      // Tabela de candidaturas
      `CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serviceId INTEGER NOT NULL,
        assemblerId INTEGER NOT NULL,
        message TEXT NOT NULL,
        price TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serviceId) REFERENCES services (id),
        FOREIGN KEY (assemblerId) REFERENCES assemblers (id)
      )`,

      // Tabela de mensagens
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serviceId INTEGER NOT NULL,
        fromUserId INTEGER NOT NULL,
        toUserId INTEGER NOT NULL,
        content TEXT NOT NULL,
        fileUrl TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serviceId) REFERENCES services (id),
        FOREIGN KEY (fromUserId) REFERENCES users (id),
        FOREIGN KEY (toUserId) REFERENCES users (id)
      )`,

      // Tabela de avaliações
      `CREATE TABLE IF NOT EXISTS ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serviceId INTEGER NOT NULL,
        fromUserId INTEGER NOT NULL,
        toUserId INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (serviceId) REFERENCES services (id),
        FOREIGN KEY (fromUserId) REFERENCES users (id),
        FOREIGN KEY (toUserId) REFERENCES users (id)
      )`,

      // Tabela de contas bancárias
      `CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        bankName TEXT NOT NULL,
        accountType TEXT NOT NULL,
        agency TEXT NOT NULL,
        accountNumber TEXT NOT NULL,
        accountHolder TEXT NOT NULL,
        documentNumber TEXT NOT NULL,
        pixKey TEXT,
        pixKeyType TEXT,
        isMain INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users (id)
      )`
    ];

    for (const tableSQL of tables) {
      await this.db.executeSql(tableSQL);
    }
  }

  // Métodos para usuários
  async createUser(user: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO users (username, password, name, email, phone, birthDate, userType, profilePhotoUrl, profileData)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.username,
        user.password,
        user.name,
        user.email,
        user.phone || null,
        user.birthDate,
        user.userType,
        user.profilePhotoUrl,
        JSON.stringify(user.profileData || {}),
      ]
    );

    return this.getUserById(result.insertId);
  }

  async getUserById(id: number): Promise<User> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const row = result.rows.item(0);
    return {
      ...row,
      profileData: row.profileData ? JSON.parse(row.profileData) : null,
    };
  }

  async getUserByUsername(username: string): Promise<User | null> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    return {
      ...row,
      profileData: row.profileData ? JSON.parse(row.profileData) : null,
    };
  }

  // Métodos para lojas
  async createStore(store: Omit<Store, 'id'>): Promise<Store> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO stores (userId, name, documentType, documentNumber, cnpj, address, city, state, phone, logoUrl, materialTypes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        store.userId,
        store.name,
        store.documentType,
        store.documentNumber,
        store.cnpj,
        store.address,
        store.city,
        store.state,
        store.phone || null,
        store.logoUrl,
        JSON.stringify(store.materialTypes || []),
      ]
    );

    return this.getStoreById(result.insertId);
  }

  async getStoreById(id: number): Promise<Store> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM stores WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Store not found');
    }

    const row = result.rows.item(0);
    return {
      ...row,
      materialTypes: row.materialTypes ? JSON.parse(row.materialTypes) : [],
    };
  }

  async getStoreByUserId(userId: number): Promise<Store | null> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM stores WHERE userId = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    return {
      ...row,
      materialTypes: row.materialTypes ? JSON.parse(row.materialTypes) : [],
    };
  }

  // Métodos para montadores
  async createAssembler(assembler: Omit<Assembler, 'id'>): Promise<Assembler> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO assemblers (userId, address, addressNumber, neighborhood, cep, city, state, specialties, technicalAssistance, experience, workRadius, rating, documents, documentType, documentNumber, rgFrontUrl, rgBackUrl, proofOfAddressUrl, certificatesUrls, experienceYears, serviceTypes, availability, hasOwnTools, professionalDescription)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assembler.userId,
        assembler.address,
        assembler.addressNumber || null,
        assembler.neighborhood || null,
        assembler.cep || null,
        assembler.city,
        assembler.state,
        JSON.stringify(assembler.specialties || []),
        assembler.technicalAssistance ? 1 : 0,
        assembler.experience || null,
        assembler.workRadius,
        assembler.rating || null,
        JSON.stringify(assembler.documents || {}),
        assembler.documentType || null,
        assembler.documentNumber || null,
        assembler.rgFrontUrl,
        assembler.rgBackUrl,
        assembler.proofOfAddressUrl,
        JSON.stringify(assembler.certificatesUrls || []),
        assembler.experienceYears,
        JSON.stringify(assembler.serviceTypes || []),
        JSON.stringify(assembler.availability || {}),
        assembler.hasOwnTools ? 1 : 0,
        assembler.professionalDescription || null,
      ]
    );

    return this.getAssemblerById(result.insertId);
  }

  async getAssemblerById(id: number): Promise<Assembler> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM assemblers WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Assembler not found');
    }

    const row = result.rows.item(0);
    return {
      ...row,
      technicalAssistance: row.technicalAssistance === 1,
      hasOwnTools: row.hasOwnTools === 1,
      specialties: row.specialties ? JSON.parse(row.specialties) : [],
      documents: row.documents ? JSON.parse(row.documents) : {},
      certificatesUrls: row.certificatesUrls ? JSON.parse(row.certificatesUrls) : [],
      serviceTypes: row.serviceTypes ? JSON.parse(row.serviceTypes) : [],
      availability: row.availability ? JSON.parse(row.availability) : {},
    };
  }

  async getAssemblerByUserId(userId: number): Promise<Assembler | null> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM assemblers WHERE userId = ?',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows.item(0);
    return {
      ...row,
      technicalAssistance: row.technicalAssistance === 1,
      hasOwnTools: row.hasOwnTools === 1,
      specialties: row.specialties ? JSON.parse(row.specialties) : [],
      documents: row.documents ? JSON.parse(row.documents) : {},
      certificatesUrls: row.certificatesUrls ? JSON.parse(row.certificatesUrls) : [],
      serviceTypes: row.serviceTypes ? JSON.parse(row.serviceTypes) : [],
      availability: row.availability ? JSON.parse(row.availability) : {},
    };
  }

  // Métodos para serviços
  async createService(service: Omit<Service, 'id' | 'createdAt'>): Promise<Service> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      `INSERT INTO services (storeId, title, description, location, address, addressNumber, cep, latitude, longitude, startDate, endDate, price, status, materialType, projectFiles, paymentReference, paymentStatus, paymentProof, ratingRequired, storeRatingCompleted, assemblerRatingCompleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        service.storeId,
        service.title,
        service.description,
        service.location,
        service.address || null,
        service.addressNumber || null,
        service.cep || null,
        service.latitude,
        service.longitude,
        service.startDate.toISOString(),
        service.endDate.toISOString(),
        service.price,
        service.status,
        service.materialType,
        JSON.stringify(service.projectFiles),
        service.paymentReference || null,
        service.paymentStatus,
        service.paymentProof || null,
        service.ratingRequired ? 1 : 0,
        service.storeRatingCompleted ? 1 : 0,
        service.assemblerRatingCompleted ? 1 : 0,
      ]
    );

    return this.getServiceById(result.insertId);
  }

  async getServiceById(id: number): Promise<Service> {
    if (!this.db) throw new Error('Database not initialized');

    const [result] = await this.db.executeSql(
      'SELECT * FROM services WHERE id = ?',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Service not found');
    }

    const row = result.rows.item(0);
    return {
      ...row,
      startDate: new Date(row.startDate),
      endDate: new Date(row.endDate),
      createdAt: new Date(row.createdAt),
      projectFiles: JSON.parse(row.projectFiles),
      ratingRequired: row.ratingRequired === 1,
      storeRatingCompleted: row.storeRatingCompleted === 1,
      assemblerRatingCompleted: row.assemblerRatingCompleted === 1,
    };
  }

  async getServicesByStoreId(storeId: number, status?: string): Promise<Service[]> {
    if (!this.db) throw new Error('Database not initialized');

    let query = 'SELECT * FROM services WHERE storeId = ?';
    const params = [storeId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    const [result] = await this.db.executeSql(query, params);

    const services: Service[] = [];
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      services.push({
        ...row,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        createdAt: new Date(row.createdAt),
        projectFiles: JSON.parse(row.projectFiles),
        ratingRequired: row.ratingRequired === 1,
        storeRatingCompleted: row.storeRatingCompleted === 1,
        assemblerRatingCompleted: row.assemblerRatingCompleted === 1,
      });
    }

    return services;
  }

  // Método para fechar conexão
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Instância singleton do banco de dados
export const databaseService = new DatabaseService();