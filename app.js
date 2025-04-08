// Inicialização do banco de dados com Dexie.js
const db = new Dexie('GestorOrcamentoFamiliarDB');
db.version(1).stores({
    transacoes: '++id, tipo, data, valor, categoria, descricao'
});

// Elementos do DOM
const formularioTransacao = document.getElementById('formulario-transacao');
const tipoTransacao = document.getElementById('tipo-transacao');
const dataTransacao = document.getElementById('data-transacao');
const valorTransacao = document.getElementById('valor-transacao');
const categoriaTransacao = document.getElementById('categoria-transacao');
const descricaoTransacao = document.getElementById('descricao-transacao');
const tabelaTransacoes = document.getElementById('tabela-transacoes');
const totalReceitas = document.getElementById('total-receitas');
const totalDespesas = document.getElementById('total-despesas');
const saldo = document.getElementById('saldo');
const filtroTodas = document.getElementById('filtro-todas');
const filtroReceitas = document.getElementById('filtro-receitas');
const filtroDespesas = document.getElementById('filtro-despesas');

// Definir data atual no campo de data
dataTransacao.valueAsDate = new Date();

// Variáveis para os gráficos
let graficoSemanal;
let graficoMensal;

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await atualizarPainel();
    iniciarGraficos();
    
    // Adicionar listeners para os filtros
    filtroTodas.addEventListener('click', () => aplicarFiltro('todas'));
    filtroReceitas.addEventListener('click', () => aplicarFiltro('receita'));
    filtroDespesas.addEventListener('click', () => aplicarFiltro('despesa'));
});

// Adicionar nova transação
formularioTransacao.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const transacao = {
        tipo: tipoTransacao.value,
        data: dataTransacao.value,
        valor: parseFloat(valorTransacao.value),
        categoria: categoriaTransacao.value,
        descricao: descricaoTransacao.value || '',
        criadoEm: new Date()
    };
    
    try {
        await db.transacoes.add(transacao);
        formularioTransacao.reset();
        dataTransacao.valueAsDate = new Date();
        await atualizarPainel();
        atualizarGraficos();
        alert('Transação adicionada com sucesso!');
    } catch (erro) {
        console.error('Erro ao adicionar transação:', erro);
        alert('Erro ao adicionar transação. Verifique a consola para mais detalhes.');
    }
});

// Atualizar painel
async function atualizarPainel(filtro = 'todas') {
    try {
        // Obter todas as transações
        let transacoes;
        
        if (filtro === 'todas') {
            transacoes = await db.transacoes.orderBy('data').reverse().toArray();
        } else {
            transacoes = await db.transacoes.where('tipo').equals(filtro).sortBy('data');
            transacoes.reverse();
        }
        
        // Atualizar tabela de transações
        renderizarTabelaTransacoes(transacoes);
        
        // Calcular totais
        const receitas = await db.transacoes.where('tipo').equals('receita').toArray();
        const despesas = await db.transacoes.where('tipo').equals('despesa').toArray();
        
        const valorTotalReceitas = receitas.reduce((soma, transacao) => soma + transacao.valor, 0);
        const valorTotalDespesas = despesas.reduce((soma, transacao) => soma + transacao.valor, 0);
        const valorSaldo = valorTotalReceitas - valorTotalDespesas;
        
        // Atualizar resumo financeiro
        totalReceitas.textContent = formatarMoeda(valorTotalReceitas);
        totalDespesas.textContent = formatarMoeda(valorTotalDespesas);
        saldo.textContent = formatarMoeda(valorSaldo);
        
        // Atualizar classe do saldo com base no valor
        if (valorSaldo > 0) {
            saldo.parentElement.classList.remove('bg-danger');
            saldo.parentElement.classList.add('bg-primary');
        } else if (valorSaldo < 0) {
            saldo.parentElement.classList.remove('bg-primary');
            saldo.parentElement.classList.add('bg-danger');
        }
    } catch (erro) {
        console.error('Erro ao atualizar painel:', erro);
    }
}

// Renderizar tabela de transações
function renderizarTabelaTransacoes(transacoes) {
    tabelaTransacoes.innerHTML = '';
    
    if (transacoes.length === 0) {
        const linhaVazia = document.createElement('tr');
        linhaVazia.innerHTML = `<td colspan="6" class="text-center">Nenhuma transação encontrada</td>`;
        tabelaTransacoes.appendChild(linhaVazia);
        return;
    }
    
    transacoes.forEach(transacao => {
        const linha = document.createElement('tr');
        linha.className = transacao.tipo === 'receita' ? 'linha-receita' : 'linha-despesa';
        
        const dataFormatada = new Date(transacao.data).toLocaleDateString('pt-PT');
        const tipoLabel = transacao.tipo === 'receita' ? 'Receita' : 'Despesa';
        const tipoClasse = transacao.tipo === 'receita' ? 'success' : 'danger';
        
        linha.innerHTML = `
            <td>${dataFormatada}</td>
            <td><span class="badge bg-${tipoClasse}">${tipoLabel}</span></td>
            <td>${transacao.categoria}</td>
            <td>${transacao.descricao || '-'}</td>
            <td class="valor-transacao ${transacao.tipo}">${formatarMoeda(transacao.valor)}</td>
            <td>
                <button class="btn btn-sm btn-outline-danger btn-apagar" data-id="${transacao.id}">
                    Apagar
                </button>
            </td>
        `;
        
        tabelaTransacoes.appendChild(linha);
        
        // Adicionar evento para o botão de apagar
        const btnApagar = linha.querySelector('.btn-apagar');
        btnApagar.addEventListener('click', async () => {
            if (confirm('Tem a certeza que deseja apagar esta transação?')) {
                await apagarTransacao(transacao.id);
            }
        });
    });
}

// Apagar transação
async function apagarTransacao(id) {
    try {
        await db.transacoes.delete(id);
        await atualizarPainel();
        atualizarGraficos();
        alert('Transação apagada com sucesso!');
    } catch (erro) {
        console.error('Erro ao apagar transação:', erro);
    }
}

// Aplicar filtro
function aplicarFiltro(filtro) {
    // Atualizar botões ativos
    [filtroTodas, filtroReceitas, filtroDespesas].forEach(btn => btn.classList.remove('active'));
    
    switch (filtro) {
        case 'receita':
            filtroReceitas.classList.add('active');
            break;
        case 'despesa':
            filtroDespesas.classList.add('active');
            break;
        default:
            filtroTodas.classList.add('active');
    }
    
    atualizarPainel(filtro);
}

// Inicializar gráficos
function iniciarGraficos() {
    // Gráfico semanal
    const contextoGraficoSemanal = document.getElementById('grafico-semanal').getContext('2d');
    graficoSemanal = new Chart(contextoGraficoSemanal, {
        type: 'bar',
        data: {
            labels: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
            datasets: [
                {
                    label: 'Receitas',
                    backgroundColor: 'rgba(25, 135, 84, 0.5)',
                    borderColor: 'rgb(25, 135, 84)',
                    borderWidth: 1,
                    data: [0, 0, 0, 0, 0, 0, 0]
                },
                {
                    label: 'Despesas',
                    backgroundColor: 'rgba(220, 53, 69, 0.5)',
                    borderColor: 'rgb(220, 53, 69)',
                    borderWidth: 1,
                    data: [0, 0, 0, 0, 0, 0, 0]
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '€ ' + value
                    }
                }
            }
        }
    });
    
    // Gráfico mensal
    const contextoGraficoMensal = document.getElementById('grafico-mensal').getContext('2d');
    graficoMensal = new Chart(contextoGraficoMensal, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
            datasets: [
                {
                    label: 'Receitas',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    borderColor: 'rgb(25, 135, 84)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                },
                {
                    label: 'Despesas',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderColor: 'rgb(220, 53, 69)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => '€ ' + value
                    }
                }
            }
        }
    });
    
    atualizarGraficos();
}

// Atualizar dados dos gráficos
async function atualizarGraficos() {
    try {
        const transacoes = await db.transacoes.toArray();
        
        // Dados para o gráfico semanal
        const dadosSemanais = {
            receita: Array(7).fill(0),
            despesa: Array(7).fill(0)
        };
        
        // Dados para o gráfico mensal
        const dadosMensais = {
            receita: Array(12).fill(0),
            despesa: Array(12).fill(0)
        };
        
        // Calcular data de início da semana atual (domingo)
        const hoje = new Date();
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        // Processar transações
        transacoes.forEach(transacao => {
            const data = new Date(transacao.data);
            const mes = data.getMonth();
            
            // Adicionar ao gráfico mensal
            if (transacao.tipo === 'receita') {
                dadosMensais.receita[mes] += transacao.valor;
            } else {
                dadosMensais.despesa[mes] += transacao.valor;
            }
            
            // Verificar se a transação é da semana atual
            if (data >= inicioSemana) {
                const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
                
                if (transacao.tipo === 'receita') {
                    dadosSemanais.receita[diaSemana] += transacao.valor;
                } else {
                    dadosSemanais.despesa[diaSemana] += transacao.valor;
                }
            }
        });
        
        // Atualizar gráfico semanal
        graficoSemanal.data.datasets[0].data = dadosSemanais.receita;
        graficoSemanal.data.datasets[1].data = dadosSemanais.despesa;
        graficoSemanal.update();
        
        // Atualizar gráfico mensal
        graficoMensal.data.datasets[0].data = dadosMensais.receita;
        graficoMensal.data.datasets[1].data = dadosMensais.despesa;
        graficoMensal.update();
    } catch (erro) {
        console.error('Erro ao atualizar gráficos:', erro);
    }
}

// Formatar valor como moeda (Euro)
function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR'
    }).format(valor);
}