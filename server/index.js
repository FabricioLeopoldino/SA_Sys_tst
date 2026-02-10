import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_FILE = join(__dirname, '../database.json');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = join(__dirname, '../uploads');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|jpg|jpeg|png|gif|csv/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype || extname) {
      return cb(null, true);
    }
    cb(new Error('Only documents and images are allowed'));
  }
});

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Helper functions
async function readDB() {
  const data = await fs.readFile(DB_FILE, 'utf8');
  return JSON.parse(data);
}

async function writeDB(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// AUTH
app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.name === name);
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// USER MANAGEMENT (Admin only)
app.get('/api/users', async (req, res) => {
  try {
    const db = await readDB();
    const users = db.users.map(({ password, ...user }) => user);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, password, role } = req.body;
    const db = await readDB();
    
    if (db.users.find(u => u.name === name)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = bcrypt.hashSync(password, 10);
    const newUser = {
      id: db.users.length + 1,
      name,
      password: hashedPassword,
      role: role || 'user',
      createdAt: new Date().toISOString()
    };
    
    db.users.push(newUser);
    await writeDB(db);
    
    const { password: _, ...userWithoutPassword } = newUser;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const db = await readDB();
    const userId = parseInt(req.params.id);
    
    const user = db.users.find(u => u.id === userId);
    if (user && user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin user' });
    }
    
    db.users = db.users.filter(u => u.id !== userId);
    await writeDB(db);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { password } = req.body;
    const db = await readDB();
    const user = db.users.find(u => u.id === parseInt(req.params.id));
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.password = bcrypt.hashSync(password, 10);
    await writeDB(db);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PRODUCTS (replaces OILS)
app.get('/api/products', async (req, res) => {
  try {
    const db = await readDB();
    const { category } = req.query;
    
    let products = db.products || [];
    if (category) {
      products = products.filter(p => p.category === category);
    }
    
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const db = await readDB();
    const product = db.products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const db = await readDB();
    const { name, category, productCode, tag, unit, currentStock, minStockLevel, shopifySkus, supplier, supplierCode, unitPerBox } = req.body;
    
    // Generate new ID
    const maxId = db.products.reduce((max, p) => {
      const num = parseInt(p.id.split('_')[1]);
      return num > max ? num : max;
    }, 0);
    
    const newProduct = {
      id: `${category.toLowerCase()}_${maxId + 1}`,
      tag: tag || `#${category}${String(maxId + 1).padStart(5, '0')}`,
      productCode: productCode || `${category}_${String(maxId + 1).padStart(5, '0')}`,
      name,
      category,
      unit: unit || 'units',
      currentStock: currentStock || 0,
      minStockLevel: minStockLevel || 0,
      shopifySkus: shopifySkus || {},
      supplier: supplier || '',
      supplierCode: supplierCode || '',
      unitPerBox: unitPerBox || 1,
      stockBoxes: unitPerBox ? Math.floor(currentStock / unitPerBox) : 0,
      createdAt: new Date().toISOString()
    };
    
    db.products.push(newProduct);
    await writeDB(db);
    
    res.json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const updatedProduct = {
      ...db.products[productIndex],
      ...req.body,
      id: db.products[productIndex].id, // Preserve ID
      updatedAt: new Date().toISOString()
    };
    
    db.products[productIndex] = updatedProduct;
    await writeDB(db);
    
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const db = await readDB();
    const productIndex = db.products.findIndex(p => p.id === req.params.id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    db.products.splice(productIndex, 1);
    await writeDB(db);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// STOCK ADJUSTMENT
app.post('/api/stock/adjust', async (req, res) => {
  try {
    const { productId, quantity, type, notes } = req.body;
    const db = await readDB();
    
    const product = db.products.find(p => p.id === productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const oldStock = product.currentStock;
    product.currentStock = type === 'add' 
      ? oldStock + quantity 
      : oldStock - quantity;
    
    // Update boxes if applicable
    if (product.unitPerBox && product.unitPerBox > 1) {
      product.stockBoxes = Math.floor(product.currentStock / product.unitPerBox);
    }
    
    const transaction = {
      id: (db.transactions.length + 1).toString(),
      productId: product.id,
      productCode: product.productCode,
      productName: product.name,
      category: product.category,
      type,
      quantity,
      unit: product.unit,
      balanceAfter: product.currentStock,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };
    
    db.transactions.unshift(transaction);
    await writeDB(db);
    
    res.json({ product, transaction });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DASHBOARD
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = await readDB();
    
    const products = db.products || [];
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.currentStock < p.minStockLevel).length;
    
    const byCategory = {
      OILS: products.filter(p => p.category === 'OILS').length,
      MACHINES_SPARES: products.filter(p => p.category === 'MACHINES_SPARES').length,
      RAW_MATERIALS: products.filter(p => p.category === 'RAW_MATERIALS').length
    };
    
    const totalStockValue = {
      oils: Math.round(products.filter(p => p.category === 'OILS').reduce((sum, p) => sum + p.currentStock, 0) / 100) / 10,
      machinesSpares: products.filter(p => p.category === 'MACHINES_SPARES').reduce((sum, p) => sum + p.currentStock, 0),
      rawMaterials: products.filter(p => p.category === 'RAW_MATERIALS').reduce((sum, p) => sum + p.currentStock, 0)
    };
    
    const recentTransactions = db.transactions.slice(0, 10);
    
    res.json({
      totalProducts,
      lowStockProducts,
      byCategory,
      totalStockValue,
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TRANSACTIONS
app.get('/api/transactions', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.transactions || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SKU MAPPINGS (updated for multi-SKU support)
app.get('/api/sku-mappings', async (req, res) => {
  try {
    const db = await readDB();
    
    // Generate mappings from products with multiple SKUs
    const mappings = [];
    db.products.forEach(product => {
      if (product.shopifySkus) {
        Object.entries(product.shopifySkus).forEach(([variant, sku]) => {
          mappings.push({
            id: `${product.id}_${variant}`,
            shopifySku: sku,
            productId: product.id,
            productCode: product.productCode,
            productName: product.name,
            variant: variant,
            category: product.category
          });
        });
      }
    });
    
    res.json(mappings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SHOPIFY WEBHOOK
// Oil volume per variant (in mL)
const VARIANT_VOLUMES = {
  'SA_CA': 400,      // Oil Cartridge 400ml
  'SA_HF': 500,      // 500ml Refill Bottle
  'SA_CDIFF': 700,   // 700ml Oil Refill
  'SA_1L': 1000,     // 1L Refill Bottle
  'SA_PRO': 1000     // 1L Pro Refill Bottle
};

app.post('/api/shopify/webhook', async (req, res) => {
  try {
    const order = req.body;
    const db = await readDB();
    
    console.log('📦 Webhook received:', JSON.stringify(order, null, 2));
    
    // Log the order
    db.shopify_orders = db.shopify_orders || [];
    db.shopify_orders.unshift({
      id: order.id || Date.now(),
      orderNumber: order.order_number || 'TEST',
      fulfillmentStatus: order.fulfillment_status || 'fulfilled',
      lineItems: order.line_items,
      receivedAt: new Date().toISOString()
    });
    
    // Process line items - handle both fulfilled status and direct webhook calls
    const lineItems = order.line_items || [];
    
    lineItems.forEach(item => {
      const sku = item.sku;
      const quantity = item.quantity || 1;
      
      console.log(`🔍 Processing SKU: ${sku}, Quantity: ${quantity}`);
      
      // Parse SKU to extract variant and oil ID
      // Format: SA_CA_00001, SA_HF_00002, SA_CDIFF_00003, SA_1L_00004, SA_PRO_00005
      let variantKey = null;
      let oilId = null;
      
      // Check for each variant prefix
      for (const variant of Object.keys(VARIANT_VOLUMES)) {
        if (sku && sku.startsWith(variant + '_')) {
          variantKey = variant;
          oilId = sku.substring(variant.length + 1); // Get the oil ID part (e.g., "00001")
          break;
        }
      }
      
      console.log(`📋 Parsed - Variant: ${variantKey}, Oil ID: ${oilId}`);
      
      if (variantKey && oilId) {
        // Find the oil product by matching the SKU
        const oilProduct = db.products.find(p => {
          if (p.category !== 'OILS' || !p.shopifySkus) return false;
          return p.shopifySkus[variantKey] === sku;
        });
        
        if (oilProduct) {
          console.log(`🛢️ Found oil: ${oilProduct.name}`);
          
          // 1. DEDUCT OIL FIRST
          const oilVolume = VARIANT_VOLUMES[variantKey];
          const totalOilDeduction = oilVolume * quantity;
          const oldOilStock = oilProduct.currentStock;
          oilProduct.currentStock = Math.max(0, oldOilStock - totalOilDeduction);
          
          db.transactions.unshift({
            id: (db.transactions.length + 1).toString(),
            productId: oilProduct.id,
            productCode: oilProduct.productCode,
            productName: oilProduct.name,
            category: oilProduct.category,
            type: 'remove',
            quantity: totalOilDeduction,
            unit: oilProduct.unit,
            balanceAfter: oilProduct.currentStock,
            notes: `Shopify Order #${order.order_number || 'N/A'} - ${variantKey}`,
            shopifyOrderId: order.id || Date.now(),
            createdAt: new Date().toISOString()
          });
          
          console.log(`✅ Oil deducted: ${oilProduct.name} - ${totalOilDeduction} mL`);
          
          // 2. DEDUCT BOM COMPONENTS
          const bom = db.bom || {};
          const bomItems = bom[variantKey] || [];
          
          console.log(`📦 BOM items for ${variantKey}:`, bomItems.length);
          
          bomItems.forEach(bomItem => {
            // Skip header rows and empty entries
            if (!bomItem.componentCode || 
                bomItem.componentCode === 'PRODUCT_CODE' || 
                bomItem.componentCode.includes('Oil Cartridge') ||
                bomItem.componentCode.includes('Oil Refill') ||
                bomItem.componentCode.includes('Bottle')) {
              return;
            }
            
            // Find component by productCode (SA_RM_XXXXX format)
            // BOM has componentCode as SA_RAWM_XXXXX but products have SA_RM_XXXXX
            let componentCode = bomItem.componentCode;
            
            // Try to find by exact match first
            let component = db.products.find(p => p.productCode === componentCode);
            
            // If not found, try converting SA_RAWM to SA_RM
            if (!component && componentCode.includes('SA_RAWM_')) {
              const rmCode = componentCode.replace('SA_RAWM_', 'SA_RM_');
              component = db.products.find(p => p.productCode === rmCode);
            }
            
            if (component) {
              // Parse quantity - handle "1 UNIT", "1", etc.
              let qty = parseInt(bomItem.quantity) || 0;
              if (qty === 0 && bomItem.quantity) {
                const match = bomItem.quantity.match(/\d+/);
                if (match) qty = parseInt(match[0]);
              }
              
              if (qty > 0) {
                const totalComponentDeduction = qty * quantity;
                const oldStock = component.currentStock;
                component.currentStock = Math.max(0, oldStock - totalComponentDeduction);
                
                // Update boxes if applicable
                if (component.unitPerBox && component.unitPerBox > 1) {
                  component.stockBoxes = Math.floor(component.currentStock / component.unitPerBox);
                }
                
                db.transactions.unshift({
                  id: (db.transactions.length + 1).toString(),
                  productId: component.id,
                  productCode: component.productCode,
                  productName: component.name,
                  category: component.category,
                  type: 'remove',
                  quantity: totalComponentDeduction,
                  unit: component.unit,
                  balanceAfter: component.currentStock,
                  notes: `Shopify Order #${order.order_number || 'N/A'} - BOM ${variantKey}`,
                  shopifyOrderId: order.id || Date.now(),
                  createdAt: new Date().toISOString()
                });
                
                console.log(`✅ Component deducted: ${component.name} - ${totalComponentDeduction} ${component.unit}`);
              }
            } else {
              console.log(`⚠️ Component not found: ${componentCode}`);
            }
          });
        } else {
          console.log(`⚠️ Oil product not found for SKU: ${sku}`);
        }
      } else {
        // Not an oil variant - check for direct product match (machines, raw materials)
        const simpleProduct = db.products.find(p => {
          if (!p.shopifySkus) return false;
          return Object.values(p.shopifySkus).includes(sku);
        });
        
        if (simpleProduct) {
          const oldStock = simpleProduct.currentStock;
          simpleProduct.currentStock = Math.max(0, oldStock - quantity);
          
          db.transactions.unshift({
            id: (db.transactions.length + 1).toString(),
            productId: simpleProduct.id,
            productCode: simpleProduct.productCode,
            productName: simpleProduct.name,
            category: simpleProduct.category,
            type: 'remove',
            quantity: quantity,
            unit: simpleProduct.unit,
            balanceAfter: simpleProduct.currentStock,
            notes: `Shopify Order #${order.order_number || 'N/A'}`,
            shopifyOrderId: order.id || Date.now(),
            createdAt: new Date().toISOString()
          });
          
          console.log(`✅ Product deducted: ${simpleProduct.name} - ${quantity} ${simpleProduct.unit}`);
        } else {
          console.log(`⚠️ Product not found for SKU: ${sku}`);
        }
      }
    });
    
    await writeDB(db);
    console.log('💾 Database saved successfully');
    
    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// BOM ENDPOINTS
app.get('/api/bom', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.bom || {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bom/:variant', async (req, res) => {
  try {
    const { variant } = req.params;
    const db = await readDB();
    const bom = db.bom || {};
    res.json(bom[variant] || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE ENTIRE BOM FOR A VARIANT
app.put('/api/bom/:variant', async (req, res) => {
  try {
    const { variant } = req.params;
    const { components } = req.body;
    const db = await readDB();
    
    if (!db.bom) db.bom = {};
    db.bom[variant] = components;
    
    await writeDB(db);
    res.json({ success: true, bom: db.bom[variant] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ADD COMPONENT TO BOM
app.post('/api/bom/:variant/component', async (req, res) => {
  try {
    const { variant } = req.params;
    const { componentCode, componentName, quantity } = req.body;
    const db = await readDB();
    
    if (!db.bom) db.bom = {};
    if (!db.bom[variant]) db.bom[variant] = [];
    
    // Check if component already exists
    const existingIndex = db.bom[variant].findIndex(c => c.componentCode === componentCode);
    if (existingIndex >= 0) {
      return res.status(400).json({ error: 'Component already exists in BOM' });
    }
    
    const newSeq = db.bom[variant].length + 1;
    db.bom[variant].push({
      seq: newSeq,
      componentCode,
      componentName,
      quantity
    });
    
    await writeDB(db);
    res.json({ success: true, bom: db.bom[variant] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE COMPONENT IN BOM
app.put('/api/bom/:variant/component/:componentCode', async (req, res) => {
  try {
    const { variant, componentCode } = req.params;
    const { componentName, quantity } = req.body;
    const db = await readDB();
    
    if (!db.bom || !db.bom[variant]) {
      return res.status(404).json({ error: 'BOM variant not found' });
    }
    
    const componentIndex = db.bom[variant].findIndex(c => c.componentCode === componentCode);
    if (componentIndex === -1) {
      return res.status(404).json({ error: 'Component not found in BOM' });
    }
    
    db.bom[variant][componentIndex] = {
      ...db.bom[variant][componentIndex],
      componentName: componentName || db.bom[variant][componentIndex].componentName,
      quantity: quantity !== undefined ? quantity : db.bom[variant][componentIndex].quantity
    };
    
    await writeDB(db);
    res.json({ success: true, bom: db.bom[variant] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE COMPONENT FROM BOM
app.delete('/api/bom/:variant/component/:componentCode', async (req, res) => {
  try {
    const { variant, componentCode } = req.params;
    const db = await readDB();
    
    if (!db.bom || !db.bom[variant]) {
      return res.status(404).json({ error: 'BOM variant not found' });
    }
    
    const componentIndex = db.bom[variant].findIndex(c => c.componentCode === componentCode);
    if (componentIndex === -1) {
      return res.status(404).json({ error: 'Component not found in BOM' });
    }
    
    db.bom[variant].splice(componentIndex, 1);
    
    // Re-sequence
    db.bom[variant] = db.bom[variant].map((item, index) => ({
      ...item,
      seq: index + 1
    }));
    
    await writeDB(db);
    res.json({ success: true, bom: db.bom[variant] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// EXPORT TO EXCEL (placeholder - will be implemented in frontend)
app.get('/api/export/products', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.products || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/export/transactions', async (req, res) => {
  try {
    const db = await readDB();
    res.json(db.transactions || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ATTACHMENTS API
app.get('/api/attachments', async (req, res) => {
  try {
    const db = await readDB();
    const { oilId, fileType } = req.query;
    
    let attachments = db.attachments || [];
    
    if (oilId) {
      attachments = attachments.filter(a => a.associatedOilId === oilId);
    }
    
    if (fileType) {
      attachments = attachments.filter(a => a.fileType.includes(fileType));
    }
    
    res.json(attachments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attachments/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { associatedOilId, associatedOilName, uploadedBy, notes } = req.body;
    const db = await readDB();
    
    const newAttachment = {
      id: (db.attachments.length + 1).toString(),
      fileName: req.file.originalname,
      storedFileName: req.file.filename,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/uploads/${req.file.filename}`,
      associatedOilId: associatedOilId || 'GENERAL',
      associatedOilName: associatedOilName || 'General Documents',
      uploadedBy: uploadedBy || 'admin',
      notes: notes || '',
      uploadDate: new Date().toISOString()
    };
    
    db.attachments.push(newAttachment);
    await writeDB(db);
    
    res.json(newAttachment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  try {
    const db = await readDB();
    const attachmentIndex = db.attachments.findIndex(a => a.id === req.params.id);
    
    if (attachmentIndex === -1) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = db.attachments[attachmentIndex];
    const filePath = join(__dirname, '../uploads', attachment.storedFileName);
    
    // Delete file from disk
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }
    
    db.attachments.splice(attachmentIndex, 1);
    await writeDB(db);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend in production (after vite build)
const distPath = join(__dirname, '../dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // All non-API routes serve the frontend
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
  console.log('📦 Serving frontend from dist/');
}

// Ensure uploads directory exists
const uploadsDir = join(__dirname, '../uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
