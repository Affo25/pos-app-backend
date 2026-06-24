const fs = require('fs');
const path = require('path');

// Get model name and fields from CLI
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node generator.js <ModelName> <field1> <field2> ...');
  console.error('Example: node generator.js Product name price description');
  process.exit(1);
}

const [modelName, ...fields] = args;

// Format fileName (lowercase first letter)
const toFileName = (name) => name.charAt(0).toLowerCase() + name.slice(1);

// Helper to generate Mongoose schema fields
const generateFields = (fields) => {
  return fields.map(field => `  ${field}: { type: String, required: true }`).join(',\n');
};

// Paths
const basePath = path.join(__dirname, '..');
const modelPath = path.join(basePath, 'models', `${modelName}.js`);
const controllerFileName = `${toFileName(modelName)}Controller.js`;
const controllerPath = path.join(basePath, 'controllers', controllerFileName);
const routePath = path.join(basePath, 'routes', `${toFileName(modelName)}Routes.js`);
const appJsPath = path.join(basePath, 'app.js');

// Ensure folder exists
const ensureDirectoryExists = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Generate files
try {
  [modelPath, controllerPath, routePath].forEach(ensureDirectoryExists);

  // === Generate Model ===
  fs.writeFileSync(modelPath, `const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
${generateFields(fields)},
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
}, { timestamps: true });

module.exports = mongoose.model('${modelName}', ${modelName}Schema);
`);

  // === Generate Controller ===
  fs.writeFileSync(controllerPath, `const ${modelName} = require('../models/${modelName}');

exports.create${modelName} = async (req, res) => {
  try {
     const adminId =
      req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;
    const data = {
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id,
    };

    const new${modelName} = new ${modelName}(data);
    await new${modelName}.save();
    res.status(201).json(new${modelName});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.get${modelName}s = async (req, res) => {
  try {
    const adminId = req.user.user_type === 'admin' ? req.user._id : req.user.admin_id;

    const query = {
      admin_id: adminId,
    };

    if (req.user.user_type === 'user') {
      query.created_by = req.user.id;
    }

    const ${toFileName(modelName)}s = await ${modelName}.find(query);
    res.status(200).json(${toFileName(modelName)}s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkFacultyAccess = async (id, user) => {
  const faculty = await ${modelName}.findById(id);
  if (!faculty) throw new Error('Faculty not found');

  const loggedInAdminId = user.user_type === 'admin' ? user._id : user.admin_id;
  if (faculty.admin_id.toString() !== loggedInAdminId.toString()) {
    throw new Error('Unauthorized access');
  }

  return faculty;
};

exports.update${modelName} = async (req, res) => {
  try {
    await checkFacultyAccess(req.params.id, req.user);

    const updated = await ${modelName}.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete${modelName} = async (req, res) => {
  try {
  await checkFacultyAccess(req.params.id, req.user);
    await ${modelName}.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: '${modelName} deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
`);

  // === Generate Routes ===
  fs.writeFileSync(routePath, `const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const {
  create${modelName},
  get${modelName}s,
  update${modelName},
  delete${modelName}
} = require('../controllers/${controllerFileName.replace('.js', '')}');

const router = express.Router();

router.post('/', protect, create${modelName});
router.get('/', protect, get${modelName}s);
router.put('/:id', protect, update${modelName});
router.delete('/:id', protect, delete${modelName});

module.exports = router;
`);

  // === Auto Inject into app.js ===
  if (fs.existsSync(appJsPath)) {
    let appJsContent = fs.readFileSync(appJsPath, 'utf-8');
    const importLine = `const ${toFileName(modelName)}Routes = require('./routes/${toFileName(modelName)}Routes');`;
    const useLine = `app.use('/api/${toFileName(modelName)}s', ${toFileName(modelName)}Routes);`;

    if (!appJsContent.includes(importLine)) {
      appJsContent = importLine + '\n' + appJsContent;
    }

    if (!appJsContent.includes(useLine)) {
      const exportIndex = appJsContent.indexOf('module.exports');
      appJsContent =
        appJsContent.slice(0, exportIndex) +
        useLine + '\n' +
        appJsContent.slice(exportIndex);
    }

    fs.writeFileSync(appJsPath, appJsContent);
  }

  // === Success Message ===
  console.log('✅ Successfully generated:');
  console.log(`- Model: ${modelPath}`);
  console.log(`- Controller: ${controllerPath}`);
  console.log(`- Routes: ${routePath}`);
  console.log(`- Route auto-injected into app.js`);

} catch (error) {
  console.error('❌ Error generating files:', error);
  process.exit(1);
}
