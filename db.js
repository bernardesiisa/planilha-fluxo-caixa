// Configuração do Dexie.js para IndexedDB
const db = new Dexie('orcamentoFamiliar');

// Definição do schema do banco de dados
db.version(1).stores({
    transacoes: '++id, tipo, data, valor, categoria, descricao, criadoEm'
});

// Função para sincronizar dados
async function sincronizarDados() {
    try {
        const transacoes = await db.transacoes.toArray();
        localStorage.setItem('backup_transacoes', JSON.stringify(transacoes));
    } catch (erro) {
        console.error('Erro ao sincronizar dados:', erro);
    }
}

// Função para restaurar dados do backup
async function restaurarDados() {
    try {
        const backupData = localStorage.getItem('backup_transacoes');
        if (backupData) {
            const transacoes = JSON.parse(backupData);
            await db.transacoes.bulkPut(transacoes);
        }
    } catch (erro) {
        console.error('Erro ao restaurar dados:', erro);
    }
}

// Sincronizar dados a cada 5 minutos
setInterval(sincronizarDados, 5 * 60 * 1000);

// Exportar funções e objeto do banco de dados
export { db, sincronizarDados, restaurarDados };