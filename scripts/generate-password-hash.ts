import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password <password>');
  console.error('Example: npm run hash-password "mySecurePassword123"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);

console.log('\n✅ Password hash generated successfully!\n');
console.log('Add this to your .env.local file:');
console.log('─'.repeat(60));
console.log(`PRIVATE_PASSWORD_HASH=${hash}`);
console.log('─'.repeat(60));
console.log('\nKeep this hash secure and never commit it to git!\n');
