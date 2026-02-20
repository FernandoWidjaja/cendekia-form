/**
 * Export ScoreDetail from Redis to Excel
 * Run with: node export-redis-scores.mjs
 */

import { config } from 'dotenv';
import { Redis } from '@upstash/redis';
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportScoreDetails() {
    console.log('🔌 Connecting to Upstash Redis...');

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('❌ Error: Redis credentials not found in .env.local');
        process.exit(1);
    }

    try {
        console.log('📥 Fetching ScoreDetails from Redis...');
        const scores = await redis.get('scoredetails:all') || [];

        console.log(`✅ Found ${scores.length} ScoreDetail records`);

        if (scores.length === 0) {
            console.log('⚠️ No data found in Redis. Export cancelled.');
            return;
        }

        // Show sample data structure
        console.log('\n📊 Sample data structure:');
        console.log(JSON.stringify(scores[0], null, 2));

        // Create worksheet from JSON data
        const worksheet = XLSX.utils.json_to_sheet(scores);

        // Auto-size columns
        const maxWidth = 50;
        const colWidths = {};
        scores.forEach(row => {
            Object.keys(row).forEach(key => {
                const value = String(row[key] || '');
                colWidths[key] = Math.min(maxWidth, Math.max(colWidths[key] || 10, value.length + 2));
            });
        });
        worksheet['!cols'] = Object.keys(colWidths).map(key => ({ wch: colWidths[key] }));

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'ScoreDetails');

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `score_details_export_${timestamp}.xlsx`;
        const filepath = path.join(__dirname, filename);

        // Write file
        XLSX.writeFile(workbook, filepath);

        console.log(`\n✅ Export successful!`);
        console.log(`📁 File saved: ${filepath}`);
        console.log(`📊 Total records: ${scores.length}`);

        // Summary by Login
        const loginCounts = {};
        scores.forEach(s => {
            loginCounts[s.Login] = (loginCounts[s.Login] || 0) + 1;
        });
        console.log(`\n👥 Records per Login:`);
        Object.entries(loginCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .forEach(([login, count]) => {
                console.log(`   ${login}: ${count} records`);
            });

        if (Object.keys(loginCounts).length > 10) {
            console.log(`   ... and ${Object.keys(loginCounts).length - 10} more logins`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

exportScoreDetails();
