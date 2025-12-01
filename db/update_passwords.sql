-- Script to update user passwords after hashing with bcrypt
-- PASSWORDS HAVE BEEN UPDATED TO:
-- admin: admin@ued
-- manager: manager@ued
-- staff: staff@ued
-- customer: customer@ued

-- To update passwords, run: node scripts/update-passwords.js
-- Or use: npm run user:set

-- Manual update (if needed):
-- UPDATE Users SET password_hash = 'your_bcrypt_hash_here' WHERE username = 'admin';
-- UPDATE Users SET password_hash = 'your_bcrypt_hash_here' WHERE username = 'manager';
-- UPDATE Users SET password_hash = 'your_bcrypt_hash_here' WHERE username = 'staff';
-- UPDATE Users SET password_hash = 'your_bcrypt_hash_here' WHERE username = 'customer';
GO

-- Generate your own with Node:
-- node -e "require('bcrypt').hash('Password123!', 10).then(console.log)"
