/**
 * Bootstrap script: runs schema init + P2Care migration + demo seed in sequence.
 */
import { initializeSchema } from './initSchema.js';
import pool from './dbConnection.js';

async function bootstrap() {
    console.log('🚀 P2Care Bootstrap — initializing schema...');
    await initializeSchema();
    console.log('✅ Schema initialized. Now seeding demo data...\n');
    
    // Dynamically import seed after schema is ready
    await import('./p2careSeedDemo.js');
}

bootstrap().catch(err => {
    console.error('❌ Bootstrap failed:', err.message);
    process.exit(1);
});
