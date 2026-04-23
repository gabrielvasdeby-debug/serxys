import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://medymhlxzfzfkjvkkexa.supabase.co';
const supabaseKey = 'sb_publishable_K8q3REFMpKiDUH4y_mdnew_dhXV4pde';
const supabase = createClient(supabaseUrl, supabaseKey);

const NEW_TERMS = `O cliente declara que as informações prestadas são verdadeiras, conferiu os dados e concorda com os termos desta Ordem de Serviço.

O equipamento passará por análise técnica, podendo haver alteração no orçamento mediante aprovação do cliente.

Após conclusão, reprovação ou impossibilidade de reparo, o equipamento deverá ser retirado em até 90 dias da notificação, sob pena de cobrança de armazenagem.

Não nos responsabilizamos por acessórios não descritos. O cliente é responsável pelo backup e pelos dados.

Equipamentos com sinais de mau uso, oxidação, quedas, violação ou reparo por terceiros podem perder a garantia.

A garantia cobre apenas os serviços realizados e peças substituídas, não incluindo danos por mau uso ou causas externas.`;

async function migrateTerms() {
  console.log('🔍 Buscando registros de os_settings no banco...');

  const { data: rows, error } = await supabase
    .from('app_settings')
    .select('*')
    .eq('key', 'os_settings');

  if (error) {
    console.error('❌ Erro ao buscar registros:', error.message);
    process.exit(1);
  }

  console.log(`📋 Encontrados ${rows.length} registros.`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const current = row.value?.printTerms || '';
    const isOldOrEmpty = !current || current.startsWith('O cliente declara, ao assinar esta Ordem de Serviço');
    
    if (isOldOrEmpty) {
      const newValue = { ...row.value, printTerms: NEW_TERMS };
      const filter = supabase
        .from('app_settings')
        .update({ value: newValue })
        .eq('key', 'os_settings');

      // company_id pode ser null em registros legados
      const { error: updateError } = row.company_id
        ? await filter.eq('company_id', row.company_id)
        : await filter.is('company_id', null);

      if (updateError) {
        console.error(`❌ Erro ao atualizar company_id=${row.company_id}:`, updateError.message);
      } else {
        console.log(`✅ Atualizado: company_id=${row.company_id || 'null (global)'}`);
        updated++;
      }
    } else {
      console.log(`⏭️  Ignorado (texto customizado detectado): company_id=${row.company_id}`);
      skipped++;
    }
  }

  console.log(`\n🎉 Migração concluída! ${updated} atualizados, ${skipped} ignorados.`);
}

migrateTerms();
