const tbody = document.querySelector("tbody");
const descItem = document.querySelector("#desc");
const amount = document.querySelector("#amount");
const type = document.querySelector("#type");
const btnNew = document.querySelector("#btnNew");

const incomes = document.querySelector(".incomes");
const expenses = document.querySelector(".expenses");
const total = document.querySelector(".total");

let items = [];

const ctx = document.getElementById('meuGrafico').getContext('2d'); // Gráfico de setores
let myChart;

btnNew.onclick = () => {
  if (descItem.value === "" || amount.value === "" || type.value === "") {
    return alert("Preencha todos os campos!");
  }

  items.push({
    desc: descItem.value,
    amount: Math.abs(amount.value).toFixed(2),
    type: type.value,
  });

  setItensBD();
  loadItens();
  descItem.value = "";
  amount.value = "";
};

function deleteItem(index) {
  items.splice(index, 1);
  setItensBD();
  loadItens();
}

function insertItem(item, index) {
  let tr = document.createElement("tr");

  tr.innerHTML = `
    <td>${item.desc}</td>
    <td>R$ ${item.amount}</td>
    <td class="columnType">${
      item.type === "Entrada"
        ? '<i class="bx bxs-chevron-up-circle"></i>'
        : '<i class="bx bxs-chevron-down-circle"></i>'
    }</td>
    <td class="columnAction">
      <button onclick="deleteItem(${index})"><i class='bx bx-trash'></i></button>
    </td>
  `;

  tbody.appendChild(tr);
}

function loadItens() {
  items = getItensBD();
  tbody.innerHTML = "";
  items.forEach((item, index) => {
    insertItem(item, index);
  });

  getTotals();
  updateChart(); // Atualiza o gráfico sempre que os dados são carregados
}

function getTotals() {
  const amountIncomes = items
    .filter((item) => item.type === "Entrada")
    .map((transaction) => Number(transaction.amount));

  const amountExpenses = items
    .filter((item) => item.type === "Saída")
    .map((transaction) => Number(transaction.amount));

  const totalIncomes = amountIncomes
    .reduce((acc, cur) => acc + cur, 0)
    .toFixed(2);

  const totalExpenses = Math.abs(
    amountExpenses.reduce((acc, cur) => acc + cur, 0)
  ).toFixed(2);

  const totalItems = (totalIncomes - totalExpenses).toFixed(2);

  incomes.innerHTML = totalIncomes;
  expenses.innerHTML = totalExpenses;
  total.innerHTML = totalItems;
}

const getItensBD = () => JSON.parse(localStorage.getItem("db_items")) ?? [];
const setItensBD = () =>
  localStorage.setItem("db_items", JSON.stringify(items));

function updateChart() {
  // Gerando os valores para o gráfico
  const totalIncomes = items
    .filter((item) => item.type === "Entrada")
    .map((transaction) => Number(transaction.amount))
    .reduce((acc, cur) => acc + cur, 0);

  const totalExpenses = items
    .filter((item) => item.type === "Saída")
    .map((transaction) => Number(transaction.amount))
    .reduce((acc, cur) => acc + cur, 0);

  const data = {
    labels: ['Entradas', 'Saídas'],
    datasets: [{
      label: 'Total',
      data: [totalIncomes, totalExpenses],
      backgroundColor: ['#00C9A7', '#D83121'], // Verde e vermelho
      borderColor: ['#00C9A7', '#D83121'],
      borderWidth: 1
    }]
  };

  if (myChart) {
    myChart.destroy(); // Destrói o gráfico anterior, se houver
  }

  // Criando o gráfico de setores
  myChart = new Chart(ctx, {
    type: 'pie', // Tipo de gráfico
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(tooltipItem) {
              return `${tooltipItem.label}: R$ ${tooltipItem.raw.toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}

function exportarParaExcel() {
  const transacoes = getItensBD(); 

  if (transacoes.length === 0) {
    alert("Nenhuma transação para exportar.");
    return;
  }

  // Mapeia os dados para um formato mais amigável para o Excel
  const dadosFormatados = transacoes.map(item => ({
    Data: new Date().toLocaleDateString('pt-BR'),  // Data atual, se não tiver campo de data
    Tipo: item.type === 'Entrada' ? 'Entrada' : 'Saída',
    Descrição: item.desc,
    Valor: `R$ ${item.amount}`,
  }));

  // Adiciona o total no final da lista de transações
  const totalEntradas = transacoes.filter(item => item.type === 'Entrada').reduce((acc, cur) => acc + parseFloat(cur.amount), 0);
  const totalSaidas = transacoes.filter(item => item.type === 'Saída').reduce((acc, cur) => acc + parseFloat(cur.amount), 0);
  const totalGeral = totalEntradas - totalSaidas;

  dadosFormatados.push({
    Data: 'Total',
    Tipo: '',
    Descrição: 'Soma de todas as transações',
    Valor: `R$ ${totalGeral.toFixed(2)}`,
  });

  // Converte para planilha
  const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);

  // Formatação: Entradas verdes, Saídas vermelhas, e total colorido conforme o valor
  worksheet['!cols'] = [
    { wch: 10 }, // Coluna Data
    { wch: 10 }, // Coluna Tipo
    { wch: 30 }, // Coluna Descrição
    { wch: 15 }, // Coluna Valor
  ];

  // Aplicando cores para valores
  dadosFormatados.forEach((item, index) => {
    const cell = worksheet[`D${index + 2}`]; // Coluna Valor (D) começa na linha 2 (excluindo cabeçalho)
    if (item.Tipo === 'Entrada') {
      cell.s = { fill: { fgColor: { rgb: "00FF00" } } }; // Verde para entrada
    } else if (item.Tipo === 'Saída') {
      cell.s = { fill: { fgColor: { rgb: "FF0000" } } }; // Vermelho para saída
    }
  });

  // Aplicando cor no total (linha final)
  const totalCell = worksheet[`D${dadosFormatados.length + 1}`]; // A última linha com o total
  if (totalGeral >= 0) {
    totalCell.s = { fill: { fgColor: { rgb: "00FF00" } } }; // Verde para total positivo
  } else {
    totalCell.s = { fill: { fgColor: { rgb: "FF0000" } } }; // Vermelho para total negativo
  }

  const workbook = XLSX.utils.book_new();

  // Adiciona a planilha ao arquivo
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transações");

  // Inicia o download do arquivo Excel
  XLSX.writeFile(workbook, "controle-financeiro.xlsx");
}
function salvarMeta() {
  const meta = parseFloat(document.getElementById("metaMensal").value);
  if (isNaN(meta) || meta <= 0) {
    alert("Digite uma meta válida.");
    return;
  }
  localStorage.setItem("meta_gastos", meta);
  verificarMeta();
}

function verificarMeta() {
  const meta = parseFloat(localStorage.getItem("meta_gastos"));
  const gastos = items
    .filter(item => item.type === "Saída")
    .reduce((acc, cur) => acc + parseFloat(cur.amount), 0);

  const aviso = document.getElementById("avisoMeta");

  if (isNaN(meta)) {
    aviso.innerText = "Nenhuma meta definida.";
    aviso.style.color = "black";
    return;
  }

  const restante = (meta - gastos).toFixed(2);

  if (restante < 0) {
    aviso.innerText = `⚠️ Você ultrapassou a meta em R$ ${Math.abs(restante)}!`;
    aviso.style.color = "red";
  } else {
    aviso.innerText = `Você ainda pode gastar R$ ${restante}.`;
    aviso.style.color = "green";
  }
}
function loadItens() {
  items = getItensBD();
  tbody.innerHTML = "";
  items.forEach((item, index) => {
    insertItem(item, index);
  });

  getTotals();
  updateChart();
  verificarMeta(); // <- Adicione isso no final
}

loadItens();
