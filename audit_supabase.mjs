import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://medymhlxzfzfkjvkkexa.supabase.co";
const SUPABASE_KEY = "sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const tables = [
  'customers',
  'orders',
  'products',
  'transactions',
  'cash_sessions',
  'receivables',
  'payables',
  'agenda',
  'sales',
  'app_settings',
  'expenses'
];

async function audit() {
  console.log("Iniciando Auditoria Paginada do Supabase...\n");
  
  let totalDbSize = 0;
  let totalImageAndPdfBytes = 0;
  const tableStats = [];
  
  let osWithImages = 0;
  let osWithPdfs = 0;
  const ordersList = [];

  for (const table of tables) {
    try {
      console.log(`Auditing table: ${table}`);
      let hasMore = true;
      let offset = 0;
      const limit = table === 'orders' ? 5 : 100; // fetch 5 orders at a time to prevent OOM
      let tableRows = 0;
      let tableSizeBytes = 0;

      while (hasMore) {
        const { data, error } = await supabase.from(table).select('*').range(offset, offset + limit - 1);
        
        if (error) {
          if (error.code !== '42P01') {
              console.log(`Erro ao ler tabela ${table} no range ${offset}-${offset+limit}:`, error.message);
          }
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        tableRows += data.length;

        for (const row of data) {
          const rowStr = JSON.stringify(row);
          const rowBytes = Buffer.byteLength(rowStr, 'utf8');
          tableSizeBytes += rowBytes;

          let hasImage = false;
          let hasPdf = false;
          let rowMediaBytes = 0;

          for (const [col, val] of Object.entries(row)) {
            if (val === null || val === undefined) continue;
            
            let valStr = '';
            if (typeof val === 'string') valStr = val;
            else if (typeof val === 'object') valStr = JSON.stringify(val);
            
            if (valStr.includes('data:image/')) {
              hasImage = true;
              const matches = valStr.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g);
              if (matches) {
                 for (const m of matches) rowMediaBytes += Buffer.byteLength(m, 'utf8');
              }
            }
            if (valStr.includes('data:application/pdf')) {
              hasPdf = true;
              const matches = valStr.match(/data:application\/pdf;base64,[A-Za-z0-9+/=]+/g);
              if (matches) {
                 for (const m of matches) rowMediaBytes += Buffer.byteLength(m, 'utf8');
              }
            }
          }
          
          totalImageAndPdfBytes += rowMediaBytes;

          if (table === 'orders') {
             if (hasImage) osWithImages++;
             if (hasPdf) osWithPdfs++;
             ordersList.push({ id: row.id, os_number: row.os_number, size: rowBytes, mediaSize: rowMediaBytes });
          }
        }
        
        offset += limit;
      }

      totalDbSize += tableSizeBytes;
      tableStats.push({
        table,
        rows: tableRows,
        sizeBytes: tableSizeBytes,
        avgSizeBytes: tableRows > 0 ? (tableSizeBytes / tableRows) : 0
      });

    } catch (e) {
      console.log(`Erro crítico na tabela ${table}:`, e.message);
    }
  }

  const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  tableStats.sort((a, b) => b.sizeBytes - a.sizeBytes);

  console.log("\n=== RELATÓRIO DE AUDITORIA ===");
  console.log(`1. Tamanho total atual do banco PostgreSQL: ${formatBytes(totalDbSize)}`);
  console.log("\n2 e 3. Tamanho individual e Quantidade de registros por tabela:");
  console.log("Tabela".padEnd(20) | "Linhas".padEnd(10) | "Tamanho Total".padEnd(15));
  console.log("-".repeat(50));
  for (const s of tableStats) {
      console.log(`${s.table.padEnd(20)} | ${s.rows.toString().padEnd(10)} | ${formatBytes(s.sizeBytes).padEnd(15)}`);
  }

  ordersList.sort((a, b) => b.size - a.size);
  console.log("\n4. Top 20 maiores registros da tabela orders:");
  for (let i = 0; i < Math.min(20, ordersList.length); i++) {
     const o = ordersList[i];
     console.log(`   #${i+1} - OS ${o.os_number} (ID: ${o.id}): ${formatBytes(o.size)}`);
  }

  const ordersStat = tableStats.find(t => t.table === 'orders');
  console.log(`\n5. Média de tamanho dos registros da tabela orders: ${ordersStat ? formatBytes(ordersStat.avgSizeBytes) : '0 B'}`);
  
  console.log(`\n6. Quantas OS possuem imagens base64: ${osWithImages}`);
  console.log(`7. Quantas OS possuem PDFs base64: ${osWithPdfs}`);
  
  console.log(`\n8. Estimativa de espaço ocupado apenas por imagens e PDFs: ${formatBytes(totalImageAndPdfBytes)}`);
}

audit();
