const { getFirestore } = require('../config/firebase-config');
const admin = require('firebase-admin');

/**
 * Base Data Access Object for Firestore operations
 * Provides common CRUD operations for all collections
 */
class FirestoreDAO {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.db = getFirestore();
  }

  /**
   * Create a new document in the collection
   * @param {Object} data - Document data
   * @param {string} customId - Optional custom document ID
   * @returns {Promise<Object>} Created document with ID
   */
  async create(data, customId = null) {
    try {
      const docRef = customId 
        ? this.db.collection(this.collectionName).doc(customId)
        : this.db.collection(this.collectionName).doc();
      
      const docData = {
        ...data,
        id: docRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await docRef.set(docData);
      
      // Fetch the document to get server-generated timestamps
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Error creating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<Object|null>} Document data or null if not found
   */
  async findById(id) {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error(`Error finding document by ID in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find documents by a single field value
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of matching documents
   */
  async findByField(field, value, limit = 100) {
    try {
      const snapshot = await this.db.collection(this.collectionName)
        .where(field, '==', value)
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error finding documents by field in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find first document by a single field value
   * @param {string} field - Field name
   * @param {any} value - Field value
   * @returns {Promise<Object|null>} First matching document or null
   */
  async findOneByField(field, value) {
    try {
      const snapshot = await this.db.collection(this.collectionName)
        .where(field, '==', value)
        .limit(1)
        .get();
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Error finding one document by field in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update a document by ID
   * @param {string} id - Document ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated document
   */
  async update(id, data) {
    try {
      const docRef = this.db.collection(this.collectionName).doc(id);
      
      await docRef.update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return this.findById(id);
    } catch (error) {
      console.error(`Error updating document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document by ID
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} True if successful
   */
  async delete(id) {
    try {
      await this.db.collection(this.collectionName).doc(id).delete();
      return true;
    } catch (error) {
      console.error(`Error deleting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Find all documents with optional filters
   * @param {Object} filters - Key-value pairs for filtering
   * @param {number} limit - Maximum number of results
   * @param {string} orderBy - Field to order by
   * @param {string} orderDirection - 'asc' or 'desc'
   * @returns {Promise<Array>} Array of documents
   */
  async findAll(filters = {}, limit = 100, orderBy = null, orderDirection = 'asc') {
    try {
      let query = this.db.collection(this.collectionName);
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        query = query.where(field, '==', value);
      });
      
      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy, orderDirection);
      }
      
      // Apply limit
      query = query.limit(limit);
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error finding all documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Count documents with optional filters
   * @param {Object} filters - Key-value pairs for filtering
   * @returns {Promise<number>} Count of documents
   */
  async count(filters = {}) {
    try {
      let query = this.db.collection(this.collectionName);
      
      Object.entries(filters).forEach(([field, value]) => {
        query = query.where(field, '==', value);
      });
      
      const snapshot = await query.count().get();
      return snapshot.data().count;
    } catch (error) {
      console.error(`Error counting documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if a document exists
   * @param {string} id - Document ID
   * @returns {Promise<boolean>} True if document exists
   */
  async exists(id) {
    try {
      const doc = await this.db.collection(this.collectionName).doc(id).get();
      return doc.exists;
    } catch (error) {
      console.error(`Error checking document existence in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Batch create multiple documents
   * @param {Array<Object>} documents - Array of documents to create
   * @returns {Promise<Array<string>>} Array of created document IDs
   */
  async batchCreate(documents) {
    try {
      const batch = this.db.batch();
      const docIds = [];
      
      documents.forEach(data => {
        const docRef = this.db.collection(this.collectionName).doc();
        const docData = {
          ...data,
          id: docRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        batch.set(docRef, docData);
        docIds.push(docRef.id);
      });
      
      await batch.commit();
      return docIds;
    } catch (error) {
      console.error(`Error batch creating documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Advanced query with multiple conditions
   * @param {Array<Object>} conditions - Array of {field, operator, value}
   * @param {number} limit - Maximum number of results
   * @param {string} orderBy - Field to order by
   * @param {string} orderDirection - 'asc' or 'desc'
   * @returns {Promise<Array>} Array of documents
   */
  async query(conditions = [], limit = 100, orderBy = null, orderDirection = 'asc') {
    try {
      let query = this.db.collection(this.collectionName);
      
      // Apply conditions
      conditions.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });
      
      // Apply ordering
      if (orderBy) {
        query = query.orderBy(orderBy, orderDirection);
      }
      
      // Apply limit
      query = query.limit(limit);
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error(`Error querying documents in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Paginated query
   * @param {Object} filters - Key-value pairs for filtering
   * @param {number} pageSize - Number of documents per page
   * @param {Object} lastDoc - Last document from previous page
   * @param {string} orderBy - Field to order by
   * @returns {Promise<Object>} {documents, lastDoc, hasMore}
   */
  async paginate(filters = {}, pageSize = 20, lastDoc = null, orderBy = 'createdAt') {
    try {
      let query = this.db.collection(this.collectionName);
      
      // Apply filters
      Object.entries(filters).forEach(([field, value]) => {
        query = query.where(field, '==', value);
      });
      
      // Apply ordering
      query = query.orderBy(orderBy, 'desc');
      
      // Start after last document if pagination
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      // Get one extra to check if there are more pages
      query = query.limit(pageSize + 1);
      
      const snapshot = await query.get();
      const documents = snapshot.docs.slice(0, pageSize).map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        _doc: doc // Store for pagination
      }));
      
      const hasMore = snapshot.docs.length > pageSize;
      const newLastDoc = hasMore ? snapshot.docs[pageSize - 1] : null;
      
      return {
        documents,
        lastDoc: newLastDoc,
        hasMore
      };
    } catch (error) {
      console.error(`Error paginating documents in ${this.collectionName}:`, error);
      throw error;
    }
  }
}

module.exports = FirestoreDAO;
