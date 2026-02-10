# Scent Stock Manager - TODO

## Attachments (Document Library) Feature

### Phase 1: Database Structure
- [x] Add "attachments" array to database.json structure
- [x] Define attachment schema (id, fileName, fileType, uploadDate, associatedOilId, filePath, fileSize, uploadedBy)

### Phase 2: Backend API
- [x] Create /api/attachments/upload endpoint (multipart/form-data)
- [x] Create /api/attachments/list endpoint (with filters)
- [x] Create /api/attachments/download/:id endpoint
- [x] Create /api/attachments/delete/:id endpoint
- [x] Add file storage in /uploads folder
- [x] Add file validation (size, type)

### Phase 3: Frontend UI
- [x] Create Attachments.jsx page component
- [x] Add "Attachments" to navigation menu
- [x] Create upload form with file input and oil selection
- [x] Create file list/grid view with filters
- [x] Add download button for each file
- [x] Add delete button (admin only)
- [x] Add search/filter by oil and file type
- [x] Add file preview icons based on type

### Phase 4: Testing
- [x] Test file upload (PDF, DOC, XLSX, images)
- [x] Test file download
- [x] Test file deletion
- [x] Test filters and search
- [x] Test with multiple files
- [x] Test file size validation

### Phase 5: Final Package
- [x] Create final ZIP with Attachments feature
- [x] Update README with Attachments documentation
- [x] Test complete system
