document.addEventListener('DOMContentLoaded', function () {
    
    // --- LÓGICA DE TEMA (MODO NOTURNO) ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggle.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            body.classList.remove('dark-mode');
            themeToggle.innerHTML = '<i data-lucide="moon"></i>';
        }
        lucide.createIcons();
    };

    themeToggle.addEventListener('click', () => {
        const newTheme = body.classList.contains('dark-mode') ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);


    // --- INICIALIZAÇÃO DO FIREBASE (GLOBAL) ---
    const firebaseConfig = { apiKey: "AIzaSyD8sNfGilLum2rnN7Qt1fBRP4ONhzemWNE", authDomain: "guilherme-2a3f3.firebaseapp.com", projectId: "guilherme-2a3f3", storageBucket: "guilherme-2a3f3.firebasestorage.app", messagingSenderId: "60682599861", appId: "1:60682599861:web:c74a9aaa7651d14cbd2dfc", measurementId: "G-MZSHRPP56K" };
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const database = firebase.database();


    // --- REFERÊNCIAS GLOBAIS DO DOM ---
    const serviceSelectionView = document.getElementById('service-selection-view');
    const rentalAppWrapper = document.getElementById('rental-app-wrapper');
    const stockControlWrapper = document.getElementById('stock-control-wrapper');
    const carControlWrapper = document.getElementById('car-control-wrapper');
    const toolControlWrapper = document.getElementById('tool-control-wrapper');

    const btnGoToRentals = document.getElementById('btn-go-to-rentals');
    const btnGoToStock = document.getElementById('btn-go-to-stock');
    const btnGoToCars = document.getElementById('btn-go-to-cars');
    const btnGoToTools = document.getElementById('btn-go-to-tools');
    const backToServicesButtons = document.querySelectorAll('.back-to-services-button');
    
    let rentalAppInitialized = false;
    let stockAppInitialized = false;
    let carAppInitialized = false;
    let toolAppInitialized = false;


    // --- GERENCIADOR DE VIEWS PRINCIPAIS ---
    const showTopLevelView = (viewId) => {
        document.querySelectorAll('.top-level-view').forEach(v => v.style.display = 'none');
        
        const viewToShow = document.getElementById(viewId);
        if (viewToShow) {
            viewToShow.style.display = (viewId === 'service-selection-view') ? 'flex' : 'block';
        }
    };
    
    // --- LÓGICA DO APP DE GERENCIAMENTO DE OBRAS ---
    const initializeRentalApp = () => {
        const passwordModal = document.getElementById('password-modal');
        const passwordForm = document.getElementById('password-form');
        const passwordInput = document.getElementById('password-input');
        const passwordError = document.getElementById('password-error');
        const appContainer = document.getElementById('app-container');
        
        const handlePasswordSubmit = (e) => {
            e.preventDefault();
            if (passwordInput.value === 'admin1234') {
                sessionStorage.setItem('isAuthenticatedRental', 'true');
                passwordModal.style.display = 'none';
                appContainer.style.display = 'block';
                if (!rentalAppInitialized) {
                    runRentalAppLogic();
                }
            } else {
                passwordError.textContent = 'Senha incorreta.';
                passwordInput.value = '';
            }
        };
        passwordForm.addEventListener('submit', handlePasswordSubmit);

        if (sessionStorage.getItem('isAuthenticatedRental') === 'true') {
            passwordModal.style.display = 'none';
            appContainer.style.display = 'block';
            if (!rentalAppInitialized) {
                runRentalAppLogic();
            }
        } else {
            appContainer.style.display = 'none';
            passwordModal.style.display = 'flex';
            passwordInput.focus();
        }
    };
    
    const runRentalAppLogic = () => {
        if (rentalAppInitialized) return;
        rentalAppInitialized = true;

        const appContainer = document.getElementById('app-container');

        const genericModal = document.getElementById('genericModal');
        const statusModal = document.getElementById('statusModal');
        const vencimentosModal = document.getElementById('vencimentosModal');
        const employeeDueModal = document.getElementById('employeeDueModal');
        const employeeDueModalClose = document.getElementById('employeeDueModalClose');
        const employeeDueList = document.getElementById('employeeDueList');
        const modalTitle = document.getElementById('modalTitle');
        const modalFields = document.getElementById('modalFields');
        const modalForm = document.getElementById('modalForm');
        const selectCliente = document.getElementById('selectCliente');
        const inputEndereco = document.getElementById('inputEndereco');
        const inputCidade = document.getElementById('inputCidade');
        const selectFornecedor = document.getElementById('selectFornecedor');
        const selectEquipamento = document.getElementById('selectEquipamento');
        const selectFuncionario = document.getElementById('selectFuncionario');
        const dataTableBody = document.getElementById('dataTableBody');
        const mainForm = document.getElementById('main-form');
        const filterCliente = document.getElementById('filterCliente');
        const filterEquipamento = document.getElementById('filterEquipamento');
        const filterFornecedor = document.getElementById('filterFornecedor');
        const filterFuncionario = document.getElementById('filterFuncionario');
        const filterStatus = document.getElementById('filterStatus');
        const filterEmployeeList = document.getElementById('filterEmployeeList');
        const filterClienteDashboard = document.getElementById('filterClienteDashboard');
        const filterEquipamentoDashboard = document.getElementById('filterEquipamentoDashboard');
        const filterFornecedorDashboard = document.getElementById('filterFornecedorDashboard');
        const filterFuncionarioDashboard = document.getElementById('filterFuncionarioDashboard');
        const filterStatusDashboard = document.getElementById('filterStatusDashboard');
        
        let currentModalType = '';
        let clientesData = {};
        let currentStatusUpdateId = null;
        let lancamentosAtuais = {};
        let funcionariosAtuais = {};

        const showRentalSubView = (viewId) => {
            appContainer.querySelectorAll('.view').forEach(view => view.style.display = 'none');
            const viewToShow = document.getElementById(viewId);
            if(viewToShow) { viewToShow.style.display = 'block'; }
            lucide.createIcons();
        };

        const router = () => {
            const hash = window.location.hash;
            if (hash.startsWith('#employee-detail/')) {
                const employeeId = hash.substring('#employee-detail/'.length);
                if (funcionariosAtuais[employeeId]) { renderEmployeeDetails(employeeId, funcionariosAtuais[employeeId].nome); }
                else { window.location.hash = '#employee-list'; }
            } else if (hash === '#employee-list') {
                renderEmployeeList();
                showRentalSubView('employee-list-view');
            } else if (hash === '#dashboard') {
                renderDashboardView();
                showRentalSubView('dashboard-view');
            } else {
                showRentalSubView('main-view');
            }
        };

        const openModal = (type) => {
            currentModalType = type;
            modalFields.innerHTML = '';
            switch (type) {
                case 'clientes':
                    modalTitle.textContent = 'Cadastrar Nova Obra/Cliente';
                    modalFields.innerHTML = `<div class="form-group"><label for="modalNomeCliente">Nome</label><input type="text" id="modalNomeCliente" required></div><div class="form-group"><label for="modalEndereco">Endereço</label><input type="text" id="modalEndereco" required></div><div class="form-group"><label for="modalCidade">Cidade</label><input type="text" id="modalCidade" required></div>`;
                    break;
                case 'fornecedores':
                    modalTitle.textContent = 'Cadastrar Novo Fornecedor';
                    modalFields.innerHTML = `<div class="form-group"><label for="modalNomeFornecedor">Nome</label><input type="text" id="modalNomeFornecedor" required></div>`;
                    break;
                case 'equipamentos':
                    modalTitle.textContent = 'Cadastrar Novo Equipamento';
                    modalFields.innerHTML = `<div class="form-group"><label for="modalNomeEquipamento">Nome</label><input type="text" id="modalNomeEquipamento" required></div>`;
                    break;
                case 'funcionarios':
                    modalTitle.textContent = 'Cadastrar Novo Funcionário';
                    modalFields.innerHTML = `<div class="form-group"><label for="modalNomeFuncionario">Nome</label><input type="text" id="modalNomeFuncionario" required></div>`;
                    break;
            }
            genericModal.style.display = 'block';
        };

        const closeModal = () => {
            genericModal.style.display = 'none';
            statusModal.style.display = 'none';
            vencimentosModal.style.display = 'none';
            employeeDueModal.style.display = 'none';
            if (modalForm) modalForm.reset();
        };

        document.getElementById('genericModalClose')?.addEventListener('click', closeModal);
        document.getElementById('vencimentosModalClose')?.addEventListener('click', closeModal);
        employeeDueModalClose?.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => { if (event.target == genericModal || event.target == statusModal || event.target == vencimentosModal || event.target == employeeDueModal) { closeModal(); } });
        document.getElementById('btnNovaObra').addEventListener('click', () => openModal('clientes'));
        document.getElementById('btnNovoFornecedor').addEventListener('click', () => openModal('fornecedores'));
        document.getElementById('btnNovoEquipamento').addEventListener('click', () => openModal('equipamentos'));
        document.getElementById('btnNovoFuncionario').addEventListener('click', () => openModal('funcionarios'));
        document.getElementById('btnFastAddCliente').addEventListener('click', () => openModal('clientes'));
        document.getElementById('btnFastAddFornecedor').addEventListener('click', () => openModal('fornecedores'));
        document.getElementById('btnFastAddEquipamento').addEventListener('click', () => openModal('equipamentos'));
        document.getElementById('btnFastAddFuncionario').addEventListener('click', () => openModal('funcionarios'));

        modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let data = {};
            switch (currentModalType) {
                case 'clientes': data = { nome: document.getElementById('modalNomeCliente').value, endereco: document.getElementById('modalEndereco').value, cidade: document.getElementById('modalCidade').value }; break;
                case 'fornecedores': data = { nome: document.getElementById('modalNomeFornecedor').value }; break;
                case 'equipamentos': data = { nome: document.getElementById('modalNomeEquipamento').value }; break;
                case 'funcionarios': data = { nome: document.getElementById('modalNomeFuncionario').value }; break;
            }
            database.ref(currentModalType).push(data).then(() => closeModal()).catch(error => console.error("Erro ao salvar: ", error));
        });

        const loadSelectOptions = (refName, selectElement, placeholder) => {
            database.ref(refName).on('value', (snapshot) => {
                const data = snapshot.val();
                if(refName === 'funcionarios') { funcionariosAtuais = data || {}; if (window.location.hash === '#employee-list') { renderEmployeeList(); } }
                if (refName === 'clientes') { clientesData = data || {}; }
                const selectedValue = selectElement.value;
                selectElement.innerHTML = `<option value="">${placeholder}</option>`;
                for (const key in data) { selectElement.innerHTML += `<option value="${key}">${data[key].nome}</option>`; }
                selectElement.value = selectedValue;
            });
        };

        loadSelectOptions('clientes', selectCliente, 'Selecione uma obra');
        loadSelectOptions('fornecedores', selectFornecedor, 'Selecione um fornecedor');
        loadSelectOptions('equipamentos', selectEquipamento, 'Selecione um equipamento');
        loadSelectOptions('funcionarios', selectFuncionario, 'Selecione um funcionário');

        selectCliente.addEventListener('change', () => {
            const cliente = clientesData[selectCliente.value];
            inputEndereco.value = cliente ? cliente.endereco : '';
            inputCidade.value = cliente ? cliente.cidade : '';
        });

        mainForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                clienteId: selectCliente.value, clienteNome: selectCliente.options[selectCliente.selectedIndex].text,
                fornecedorId: selectFornecedor.value, fornecedorNome: selectFornecedor.options[selectFornecedor.selectedIndex].text,
                equipamentoId: selectEquipamento.value, equipamentoNome: selectEquipamento.options[selectEquipamento.selectedIndex].text,
                funcionarioId: selectFuncionario.value, funcionarioNome: selectFuncionario.options[selectFuncionario.selectedIndex].text,
                ctr: document.getElementById('inputCtr').value, valor: document.getElementById('inputValor').value,
                observacao: document.getElementById('inputObservacao').value, status: 'Locado',
                dataInicio: document.getElementById('inputDataInicio').value, frequencia: document.getElementById('selectFrequencia').value,
                reagendamentoAutomatico: document.getElementById('selectFrequencia').value !== 'unico'
            };
            database.ref('lancamentos').push(data).then(() => { mainForm.reset(); inputEndereco.value = ''; inputCidade.value = ''; }).catch(error => console.error("Erro: ", error));
        });

        const calcularProximoVencimento = (dataInicioStr, frequencia, reagendamentoAutomatico) => {
            if (!dataInicioStr || !frequencia || !reagendamentoAutomatico || frequencia === 'unico') return dataInicioStr || null;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            let proximaData = new Date(dataInicioStr + 'T03:00:00Z');
            while (proximaData < hoje) {
                if (frequencia === 'diario') proximaData.setDate(proximaData.getDate() + 1);
                else if (frequencia === 'semanal') proximaData.setDate(proximaData.getDate() + 7);
                else if (frequencia === 'mensal') proximaData.setMonth(proximaData.getMonth() + 1);
                else break;
            }
            return proximaData.toISOString().split('T')[0];
        };

        const getDueDateStatus = (proximoVencimentoStr) => {
            if (!proximoVencimentoStr) return '';
            const diffDays = Math.ceil((new Date(proximoVencimentoStr + 'T03:00:00Z') - new Date().setHours(0,0,0,0)) / 864e5);
            if (diffDays <= 3) return 'due-urgent';
            if (diffDays <= 7) return 'due-soon';
            return 'due-ok';
        };

        const applyFiltersAndRender = () => {
            const queries = { c: filterCliente.value.toLowerCase(), e: filterEquipamento.value.toLowerCase(), fo: filterFornecedor.value.toLowerCase(), fu: filterFuncionario.value.toLowerCase(), s: filterStatus.value };
            dataTableBody.innerHTML = '';
            Object.keys(lancamentosAtuais).filter(key => {
                const i = lancamentosAtuais[key];
                return i.status !== 'Devolvido' && (i.clienteNome || '').toLowerCase().includes(queries.c) && (i.equipamentoNome || '').toLowerCase().includes(queries.e) && (i.fornecedorNome || '').toLowerCase().includes(queries.fo) && (i.funcionarioNome || '').toLowerCase().includes(queries.fu) && (queries.s === 'all' || i.status === queries.s);
            }).forEach(key => {
                const item = lancamentosAtuais[key];
                const proximoVencimentoStr = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                const row = dataTableBody.insertRow();
                row.className = getDueDateStatus(proximoVencimentoStr);
                const formatarFrequencia = (f) => ({ unico: 'Sem Reagendamento', diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }[f] || f || 'N/A');
                row.innerHTML = `<td>${item.clienteNome || ''}</td><td>${item.equipamentoNome || ''}</td><td>${item.fornecedorNome || ''}</td><td>${item.funcionarioNome || ''}</td><td>${item.ctr || ''}</td><td>R$ ${parseFloat(item.valor || 0).toFixed(2)}</td><td>${proximoVencimentoStr ? new Date(proximoVencimentoStr + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'}</td><td>${formatarFrequencia(item.frequencia)}</td><td><span class="status status-${(item.status || "").toLowerCase()}">${item.status}</span></td><td><button class="btn-status" data-id="${key}" title="Alterar Status"><i data-lucide="edit"></i></button></td>`;
            });
            lucide.createIcons();
        };

        database.ref('lancamentos').on('value', (snapshot) => {
            lancamentosAtuais = snapshot.val() || {};
            applyFiltersAndRender();
            if (['#dashboard', '#employee-list', '#employee-detail'].some(prefix => window.location.hash.includes(prefix))) { router(); }
        });
        
        [filterCliente, filterEquipamento, filterFornecedor, filterFuncionario, filterStatus].forEach(i => i.addEventListener('input', applyFiltersAndRender));

        dataTableBody.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-status');
            if (button) { currentStatusUpdateId = button.dataset.id; statusModal.style.display = 'block'; }
        });

        document.getElementById('btnStatusCancelar').addEventListener('click', closeModal);
        document.getElementById('btnStatusParcial').addEventListener('click', () => { if (currentStatusUpdateId) { database.ref('lancamentos/' + currentStatusUpdateId).update({ status: 'Parcial' }).then(closeModal); } });
        document.getElementById('btnStatusCompleto').addEventListener('click', () => { if (currentStatusUpdateId) { database.ref('lancamentos/' + currentStatusUpdateId).update({ status: 'Devolvido' }).then(closeModal); } });

        const renderEmployeeList = () => {
            const container = document.getElementById('employee-list-container');
            if (!container) return;
            container.innerHTML = '';
            const filterQuery = filterEmployeeList.value.toLowerCase();
            const filtered = Object.entries(funcionariosAtuais).filter(([_, f]) => (f.nome || '').toLowerCase().includes(filterQuery));
            if (filtered.length === 0) { container.innerHTML = '<p>Nenhum funcionário encontrado.</p>'; return; }
            filtered.forEach(([key, func]) => {
                container.innerHTML += `<div class="list-item"><span class="list-item-name">${func.nome}</span><a href="#employee-detail/${key}" class="view-details-button"><i data-lucide="eye"></i> Ver Detalhes</a></div>`;
            });
            lucide.createIcons();
        };
        
        filterEmployeeList.addEventListener('input', renderEmployeeList);
        
        const checkAndShowEmployeeDueModal = (employeeId) => {
            const itemsDueSoon = Object.values(lancamentosAtuais).filter(item => {
                if (item.funcionarioId !== employeeId || item.status === 'Devolvido') return false;
                const venc = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                return venc && Math.ceil((new Date(venc + 'T03:00:00Z') - new Date().setHours(0,0,0,0)) / 864e5) <= 7;
            }).map(item => ({...item, vencimento: new Date(calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico) + 'T03:00:00Z').toLocaleDateString('pt-BR')}))
              .sort((a,b) => new Date(a.dataInicio) - new Date(b.dataInicio));

            if (itemsDueSoon.length > 0) {
                employeeDueList.innerHTML = itemsDueSoon.map(item => `<div class="vencimento-item"><div class="vencimento-item-info">${item.equipamentoNome}<span>Cliente: ${item.clienteNome}</span></div><div class="vencimento-item-info"><span>Vence em: ${item.vencimento}</span></div></div>`).join('');
                employeeDueModal.style.display = 'block';
                lucide.createIcons();
            }
        };

        const renderEmployeeDetails = (employeeId, employeeName) => {
            document.getElementById('employee-detail-title').textContent = employeeName;
            const tableBody = document.getElementById('employeeDetailTableBody');
            tableBody.innerHTML = '';
            checkAndShowEmployeeDueModal(employeeId);
            Object.values(lancamentosAtuais).filter(i => i.funcionarioId === employeeId && i.status !== 'Devolvido').forEach(item => {
                const proximoVencimentoStr = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                const row = tableBody.insertRow();
                row.className = getDueDateStatus(proximoVencimentoStr);
                const formatarFrequencia = (f) => ({ unico: 'Sem Reagendamento', diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }[f] || f || 'N/A');
                row.innerHTML = `<td data-label="Cliente">${item.clienteNome || ''}</td><td data-label="Equipamento">${item.equipamentoNome || ''}</td><td data-label="Fornecedor">${item.fornecedorNome || ''}</td><td data-label="CTR">${item.ctr || ''}</td><td data-label="Valor">R$ ${parseFloat(item.valor || 0).toFixed(2)}</td><td data-label="Próx. Venc.">${proximoVencimentoStr ? new Date(proximoVencimentoStr + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'}</td><td data-label="Frequência">${formatarFrequencia(item.frequencia)}</td><td data-label="Status"><span class="status status-${(item.status || "").toLowerCase()}">${item.status}</span></td><td data-label="Observação">${item.observacao || ''}</td>`;
            });
            showRentalSubView('employee-detail-view');
        };
        
        const renderDashboardView = () => {
            const tableBody = document.getElementById('dashboardTableBody');
            if (!tableBody) return;

            const clienteQuery = filterClienteDashboard.value.toLowerCase();
            const equipamentoQuery = filterEquipamentoDashboard.value.toLowerCase();
            const fornecedorQuery = filterFornecedorDashboard.value.toLowerCase();
            const funcionarioQuery = filterFuncionarioDashboard.value.toLowerCase();
            const statusQuery = filterStatusDashboard.value;

            tableBody.innerHTML = '';

            const filteredKeys = Object.keys(lancamentosAtuais).filter(key => {
                const item = lancamentosAtuais[key];
                if (item.status === 'Devolvido') return false;

                const matchesCliente = (item.clienteNome || '').toLowerCase().includes(clienteQuery);
                const matchesEquipamento = (item.equipamentoNome || '').toLowerCase().includes(equipamentoQuery);
                const matchesFornecedor = (item.fornecedorNome || '').toLowerCase().includes(fornecedorQuery);
                const matchesFuncionario = (item.funcionarioNome || '').toLowerCase().includes(funcionarioQuery);
                const matchesStatus = statusQuery === 'all' || item.status === statusQuery;
                
                return matchesCliente && matchesEquipamento && matchesFornecedor && matchesFuncionario && matchesStatus;
            });

            filteredKeys.forEach(key => {
                const item = lancamentosAtuais[key];
                const proximoVencimentoStr = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                const dueDateClass = getDueDateStatus(proximoVencimentoStr);
                
                const row = tableBody.insertRow();
                row.className = dueDateClass;

                const formatarFrequencia = (freq) => ({ unico: 'Sem Reagendamento', diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }[freq] || freq || 'N/A');
                
                row.innerHTML = `
                    <td data-label="Cliente">${item.clienteNome || ''}</td>
                    <td data-label="Equipamento">${item.equipamentoNome || ''}</td>
                    <td data-label="Fornecedor">${item.fornecedorNome || ''}</td>
                    <td data-label="Funcionário">${item.funcionarioNome || ''}</td>
                    <td data-label="CTR">${item.ctr || ''}</td>
                    <td data-label="Valor">R$ ${parseFloat(item.valor || 0).toFixed(2)}</td>
                    <td data-label="Próx. Venc.">${proximoVencimentoStr ? new Date(proximoVencimentoStr + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'}</td>
                    <td data-label="Frequência">${formatarFrequencia(item.frequencia)}</td>
                    <td data-label="Status"><span class="status status-${(item.status || "").toLowerCase()}">${item.status}</span></td>
                    <td data-label="Observação">${item.observacao || ''}</td>
                `;
            });
            lucide.createIcons();
        };

        [filterClienteDashboard, filterEquipamentoDashboard, filterFornecedorDashboard, filterFuncionarioDashboard, filterStatusDashboard].forEach(i => i.addEventListener('input', renderDashboardView));
        
        const verificarVencimentos = () => { /* ... (código existente) ... */ };
        document.getElementById('btnVerificarVencimentosHoje').addEventListener('click', verificarVencimentos);
        
        window.addEventListener('hashchange', router);
        router();
        database.ref('lancamentos').once('value', () => { if (!window.location.hash || window.location.hash === '#') { verificarVencimentos(); } });
    };

    // --- LÓGICA DO APP DE CONTROLE DE ESTOQUE ---
    const initializeStockControlApp = () => {
        const passwordModal = document.getElementById('stock-password-modal');
        const passwordForm = document.getElementById('stock-password-form');
        const passwordInput = document.getElementById('stock-password-input');
        const passwordError = document.getElementById('stock-password-error');
        const appContainer = document.getElementById('stock-app-container');

        const handlePasswordSubmit = (e) => {
            e.preventDefault();
            if (passwordInput.value === 'estoque1234') { // Senha para o estoque
                sessionStorage.setItem('isAuthenticatedStock', 'true');
                passwordModal.style.display = 'none';
                appContainer.style.display = 'block';
                if (!stockAppInitialized) {
                    runStockControlLogic();
                }
            } else {
                passwordError.textContent = 'Senha incorreta.';
                passwordInput.value = '';
            }
        };
        passwordForm.addEventListener('submit', handlePasswordSubmit);
        
        if (sessionStorage.getItem('isAuthenticatedStock') === 'true') {
            passwordModal.style.display = 'none';
            appContainer.style.display = 'block';
            if (!stockAppInitialized) {
                runStockControlLogic();
            }
        } else {
            appContainer.style.display = 'none';
            passwordModal.style.display = 'flex';
            passwordInput.focus();
        }
    };
    
    const runStockControlLogic = () => {
        if (stockAppInitialized) return;
        stockAppInitialized = true;

        const stockRef = database.ref('estoque');
        let stockItemsData = {};

        const itemModal = document.getElementById('stock-item-modal');
        const itemModalTitle = document.getElementById('stock-item-modal-title');
        const itemForm = document.getElementById('stock-item-form');
        const movementModal = document.getElementById('stock-movement-modal');
        const movementForm = document.getElementById('stock-movement-form');
        const tableBody = document.getElementById('stock-table-body');
        
        const filterName = document.getElementById('filter-stock-name');
        const filterCode = document.getElementById('filter-stock-code');
        const filterCategory = document.getElementById('filter-stock-category');

        const openItemModal = (item = {}) => {
            itemForm.reset();
            document.getElementById('stock-item-id').value = item.id || '';
            document.getElementById('stock-item-name').value = item.nome || '';
            document.getElementById('stock-item-code').value = item.codigo || '';
            document.getElementById('stock-item-category').value = item.categoria || '';
            document.getElementById('stock-item-quantity').value = item.quantidade ?? '';
            document.getElementById('stock-item-unit').value = item.unidade || 'un';
            document.getElementById('stock-item-quantity').disabled = !!item.id;
            itemModalTitle.textContent = item.id ? 'Editar Item' : 'Adicionar Novo Item';
            itemModal.style.display = 'block';
        };

        const openMovementModal = (item) => {
            movementForm.reset();
            document.getElementById('stock-movement-item-id').value = item.id || '';
            document.getElementById('stock-movement-modal-title').textContent = `Movimentar: ${item.nome}`;
            movementModal.style.display = 'block';
        };
        
        const closeModal = () => {
            itemModal.style.display = 'none';
            movementModal.style.display = 'none';
        }
        
        document.getElementById('btn-add-stock-item').addEventListener('click', () => openItemModal());
        document.getElementById('stock-item-modal-close').addEventListener('click', closeModal);
        document.getElementById('stock-movement-modal-close').addEventListener('click', closeModal);

        itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('stock-item-id').value;
            const data = {
                nome: document.getElementById('stock-item-name').value,
                codigo: document.getElementById('stock-item-code').value,
                categoria: document.getElementById('stock-item-category').value,
                unidade: document.getElementById('stock-item-unit').value,
            };
            
            let promise;
            if (id) {
                promise = stockRef.child(id).update(data);
            } else {
                data.quantidade = parseInt(document.getElementById('stock-item-quantity').value) || 0;
                promise = stockRef.push(data);
            }

            promise.then(closeModal).catch(err => console.error("Erro ao salvar item:", err));
        });

        movementForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('stock-movement-item-id').value;
            const itemAtual = stockItemsData[id];
            if(!itemAtual) return;

            const qtdMovimento = parseInt(document.getElementById('movement-quantity').value);
            const tipoMovimento = document.getElementById('movement-type').value;
            let novaQuantidade = itemAtual.quantidade;

            if(tipoMovimento === 'saida') {
                if (qtdMovimento > novaQuantidade) {
                    alert('Quantidade de saída maior que o estoque atual!');
                    return;
                }
                novaQuantidade -= qtdMovimento;
            } else {
                novaQuantidade += qtdMovimento;
            }
            
            stockRef.child(id).update({ quantidade: novaQuantidade }).then(closeModal).catch(err => console.error("Erro ao movimentar item:", err));
        });

        const renderStockTable = () => {
            const nameQuery = filterName.value.toLowerCase();
            const codeQuery = filterCode.value.toLowerCase();
            const categoryQuery = filterCategory.value.toLowerCase();
            tableBody.innerHTML = '';

            Object.entries(stockItemsData).filter(([_, item]) => {
                const nameMatch = (item.nome || '').toLowerCase().includes(nameQuery);
                const codeMatch = (item.codigo || '').toLowerCase().includes(codeQuery);
                const categoryMatch = (item.categoria || '').toLowerCase().includes(categoryQuery);
                return nameMatch && codeMatch && categoryMatch;
            }).forEach(([id, item]) => {
                const row = tableBody.insertRow();
                row.className = item.quantidade <= 5 ? 'low-stock' : '';
                row.innerHTML = `
                    <td data-label="Item">${item.nome}</td>
                    <td data-label="Código">${item.codigo}</td>
                    <td data-label="Categoria">${item.categoria}</td>
                    <td data-label="Qtd. Atual">${item.quantidade}</td>
                    <td data-label="Unidade">${item.unidade}</td>
                    <td data-label="Ações">
                        <button class="btn-status btn-edit-stock-item" data-id="${id}"><i data-lucide="edit"></i></button>
                        <button class="btn-status btn-move-stock-item" data-id="${id}"><i data-lucide="arrow-right-left"></i></button>
                    </td>
                `;
            });
            lucide.createIcons();
        };

        stockRef.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            stockItemsData = {}; // Limpa para evitar duplicatas
            Object.keys(data).forEach(key => {
                stockItemsData[key] = { ...data[key], id: key };
            });
            renderStockTable();
        });
        
        [filterName, filterCode, filterCategory].forEach(el => el.addEventListener('input', renderStockTable));

        tableBody.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.btn-edit-stock-item');
            const moveBtn = e.target.closest('.btn-move-stock-item');
            if (editBtn) { openItemModal(stockItemsData[editBtn.dataset.id]); }
            if (moveBtn) { openMovementModal(stockItemsData[moveBtn.dataset.id]); }
        });
    };

     // --- LÓGICA DO APP DE CONTROLE DE CARROS ---
    const initializeCarControlApp = () => {
        const passwordModal = document.getElementById('car-password-modal');
        const passwordForm = document.getElementById('car-password-form');
        const passwordInput = document.getElementById('car-password-input');
        const passwordError = document.getElementById('car-password-error');
        const appContainer = document.getElementById('car-app-container');

        const handlePasswordSubmit = (e) => {
            e.preventDefault();
            if (passwordInput.value === 'carros1234') {
                sessionStorage.setItem('isAuthenticatedCar', 'true');
                passwordModal.style.display = 'none';
                appContainer.style.display = 'block';
                if (!carAppInitialized) {
                    runCarControlLogic();
                }
            } else {
                passwordError.textContent = 'Senha incorreta.';
                passwordInput.value = '';
            }
        };
        passwordForm.addEventListener('submit', handlePasswordSubmit);

        if (sessionStorage.getItem('isAuthenticatedCar') === 'true') {
            passwordModal.style.display = 'none';
            appContainer.style.display = 'block';
            if (!carAppInitialized) {
                runCarControlLogic();
            }
        } else {
            appContainer.style.display = 'none';
            passwordModal.style.display = 'flex';
            passwordInput.focus();
        }
    };

    const runCarControlLogic = () => {
        if (carAppInitialized) return;
        carAppInitialized = true;

        const carRef = database.ref('veiculos');
        let carItemsData = {};

        // Modals
        const carItemModal = document.getElementById('car-item-modal');
        const updateKmModal = document.getElementById('car-update-km-modal');
        const maintenanceModal = document.getElementById('car-maintenance-modal');
        
        // Forms
        const carItemForm = document.getElementById('car-item-form');
        const updateKmForm = document.getElementById('car-update-km-form');
        const maintenanceForm = document.getElementById('car-maintenance-form');

        const carCardContainer = document.getElementById('car-card-container');
        const filterCarName = document.getElementById('filter-car-name');
        const filterCarPlate = document.getElementById('filter-car-plate');

        const openCarModal = (modalId, data = {}) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const form = modal.querySelector('form');
            if(form) form.reset();
            
            if (modalId === 'car-item-modal') {
                modal.querySelector('#car-item-modal-title').textContent = data.id ? 'Editar Veículo' : 'Adicionar Veículo';
                modal.querySelector('#car-item-id').value = data.id || '';
                modal.querySelector('#car-item-name').value = data.nome || '';
                modal.querySelector('#car-item-plate').value = data.placa || '';
                modal.querySelector('#car-item-km').value = data.kmAtual || '';
                modal.querySelector('#car-item-cc').value = data.cc || '';
                modal.querySelector('#car-item-driver').value = data.condutor || '';
                modal.querySelector('#car-item-license').value = data.licenciamento || '';
                modal.querySelector('#car-item-renavan').value = data.renavan || '';
            } else if (modalId === 'car-update-km-modal') {
                 modal.querySelector('#car-update-km-modal-title').textContent = `Atualizar KM de ${data.nome}`;
                 modal.querySelector('#car-update-km-id').value = data.id || '';
            } else if (modalId === 'car-maintenance-modal') {
                 modal.querySelector('#car-maintenance-modal-title').textContent = `Registrar Manutenção: ${data.nome}`;
                 modal.querySelector('#car-maintenance-id').value = data.id || '';
                 modal.querySelector('#car-maintenance-km').value = data.kmAtual || '';
                 modal.querySelector('#car-next-oil-km').value = data.proximaTrocaOleoKM || '';
                 modal.querySelector('#car-next-oil-date').value = data.proximaTrocaOleoData || '';
                 modal.querySelector('#car-next-maintenance-km').value = data.proximaManutencaoKM || '';
                 modal.querySelector('#car-next-maintenance-date').value = data.proximaManutencaoData || '';
            }
            
            modal.style.display = 'block';
        };

        const closeCarModals = () => {
            carItemModal.style.display = 'none';
            updateKmModal.style.display = 'none';
            maintenanceModal.style.display = 'none';
        };

        document.getElementById('btn-add-car').addEventListener('click', () => openCarModal('car-item-modal'));
        document.getElementById('car-item-modal-close').addEventListener('click', closeCarModals);
        document.getElementById('car-update-km-modal-close').addEventListener('click', closeCarModals);
        document.getElementById('car-maintenance-modal-close').addEventListener('click', closeCarModals);

        carItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('car-item-id').value;
            const data = {
                nome: document.getElementById('car-item-name').value,
                placa: document.getElementById('car-item-plate').value,
                kmAtual: parseInt(document.getElementById('car-item-km').value) || 0,
                cc: document.getElementById('car-item-cc').value,
                condutor: document.getElementById('car-item-driver').value,
                licenciamento: document.getElementById('car-item-license').value,
                renavan: document.getElementById('car-item-renavan').value,
            };
            const promise = id ? carRef.child(id).update(data) : carRef.push(data);
            promise.then(closeCarModals).catch(err => console.error("Erro:", err));
        });

        updateKmForm.addEventListener('submit', (e) => {
             e.preventDefault();
             const id = document.getElementById('car-update-km-id').value;
             const newKm = parseInt(document.getElementById('car-update-km-input').value);
             if (id && newKm >= (carItemsData[id].kmAtual || 0)) {
                 carRef.child(id).update({ kmAtual: newKm }).then(closeCarModals);
             } else {
                 alert('A nova quilometragem deve ser maior ou igual à atual.');
             }
        });
        
        maintenanceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('car-maintenance-id').value;
            const item = carItemsData[id];
            if (!item) return;

            const serviceKm = parseInt(document.getElementById('car-maintenance-km').value);
            const updates = {
                kmAtual: serviceKm,
                proximaTrocaOleoKM: parseInt(document.getElementById('car-next-oil-km').value) || null,
                proximaTrocaOleoData: document.getElementById('car-next-oil-date').value || null,
                proximaManutencaoKM: parseInt(document.getElementById('car-next-maintenance-km').value) || null,
                proximaManutencaoData: document.getElementById('car-next-maintenance-date').value || null
            };
            
            const historico = item.historicoManutencao || [];
            historico.push({
                data: new Date().toISOString().split('T')[0],
                km: serviceKm,
                tipo: document.getElementById('car-maintenance-type').value,
            });
            updates.historicoManutencao = historico;

            carRef.child(id).update(updates).then(closeCarModals);
        });

        const renderCarCards = () => {
            const nameQuery = filterCarName.value.toLowerCase();
            const plateQuery = filterCarPlate.value.toLowerCase();
            carCardContainer.innerHTML = '';
            
            Object.entries(carItemsData).filter(([_, car]) => {
                return (car.nome || '').toLowerCase().includes(nameQuery) && (car.placa || '').toLowerCase().includes(plateQuery);
            }).forEach(([id, car]) => {
                const indicators = [];
                const kmAlertThreshold = 1000;
                const dateAlertThreshold = 30 * 24 * 60 * 60 * 1000; // 30 dias

                if (car.proximaTrocaOleoKM) {
                    if (car.kmAtual >= car.proximaTrocaOleoKM) {
                        indicators.push('<div class="indicator-bar indicator-oil-danger" title="Troca de óleo vencida"></div>');
                    } else if (car.kmAtual >= car.proximaTrocaOleoKM - kmAlertThreshold) {
                        indicators.push('<div class="indicator-bar indicator-oil-warning" title="Troca de óleo próxima"></div>');
                    }
                }
                
                if (car.licenciamento) {
                    const licenseDate = new Date(car.licenciamento);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const timeDiff = licenseDate - today;
                    
                    if (timeDiff < 0) {
                         indicators.push('<div class="indicator-bar indicator-license-danger" title="Licenciamento vencido"></div>');
                    } else if (timeDiff < dateAlertThreshold) {
                         indicators.push('<div class="indicator-bar indicator-license-warning" title="Licenciamento próximo"></div>');
                    }
                }
                
                const formatKm = (km) => km ? km.toLocaleString('pt-BR') : '-';
                const formatDate = (dateString) => {
                    if (!dateString) return '-';
                    // Adiciona um dia à data para corrigir problemas de fuso horário na exibição
                    const date = new Date(dateString);
                    date.setDate(date.getDate() + 1);
                    return date.toLocaleDateString('pt-BR');
                };
                
                const card = document.createElement('div');
                card.className = 'car-card';
                card.innerHTML = `
                    <div class="status-indicators">
                        ${indicators.join('')}
                    </div>
                    <div class="car-card-content">
                        <div class="car-card-header">
                            <h3>${car.nome || 'N/A'}</h3>
                            <p>${car.placa || 'N/A'}</p>
                        </div>
                        <div class="car-card-body">
                            <div class="car-card-item"><strong>KM Atual:</strong> ${formatKm(car.kmAtual)}</div>
                            <div class="car-card-item"><strong>Condutor:</strong> ${car.condutor || '-'}</div>
                            <div class="car-card-item"><strong>C/C:</strong> ${car.cc || '-'}</div>
                            <div class="car-card-item"><strong>Renavan:</strong> ${car.renavan || '-'}</div>
                            <div class="car-card-item"><strong>Licenciamento:</strong> ${formatDate(car.licenciamento)}</div>
                            <div class="car-card-item"><strong>Próx. Óleo (KM):</strong> ${formatKm(car.proximaTrocaOleoKM)}</div>
                        </div>
                        <div class="car-card-footer">
                            <button class="btn-status btn-edit-car" data-id="${id}" title="Editar"><i data-lucide="edit"></i></button>
                            <button class="btn-status btn-update-km" data-id="${id}" title="Atualizar KM"><i data-lucide="gauge-circle"></i></button>
                            <button class="btn-status btn-add-maintenance" data-id="${id}" title="Registrar Manutenção"><i data-lucide="wrench"></i></button>
                        </div>
                    </div>
                `;
                carCardContainer.appendChild(card);
            });
            lucide.createIcons();
        };

        carRef.on('value', snapshot => {
            const data = snapshot.val() || {};
            carItemsData = {};
            Object.keys(data).forEach(key => carItemsData[key] = { ...data[key], id: key });
            renderCarCards();
        });

        filterCarName.addEventListener('input', renderCarCards);
        filterCarPlate.addEventListener('input', renderCarCards);

        carCardContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-status');
            if(!button) return;

            const id = button.dataset.id;
            if (button.classList.contains('btn-edit-car')) openCarModal('car-item-modal', carItemsData[id]);
            if (button.classList.contains('btn-update-km')) openCarModal('car-update-km-modal', carItemsData[id]);
            if (button.classList.contains('btn-add-maintenance')) openCarModal('car-maintenance-modal', carItemsData[id]);
        });

    };
    
    // --- LÓGICA DO APP DE CONTROLE DE FERRAMENTAS ---
    const initializeToolControlApp = () => {
        const passwordModal = document.getElementById('tool-password-modal');
        const passwordForm = document.getElementById('tool-password-form');
        const passwordInput = document.getElementById('tool-password-input');
        const passwordError = document.getElementById('tool-password-error');
        const appContainer = document.getElementById('tool-app-container');

        const handlePasswordSubmit = (e) => {
            e.preventDefault();
            if (passwordInput.value === 'ferramentas1234') { // Senha para ferramentas
                sessionStorage.setItem('isAuthenticatedTool', 'true');
                passwordModal.style.display = 'none';
                appContainer.style.display = 'block';
                if (!toolAppInitialized) {
                    runToolControlLogic();
                }
            } else {
                passwordError.textContent = 'Senha incorreta.';
                passwordInput.value = '';
            }
        };
        passwordForm.addEventListener('submit', handlePasswordSubmit);

        if (sessionStorage.getItem('isAuthenticatedTool') === 'true') {
            passwordModal.style.display = 'none';
            appContainer.style.display = 'block';
            if (!toolAppInitialized) {
                runToolControlLogic();
            }
        } else {
            appContainer.style.display = 'none';
            passwordModal.style.display = 'flex';
            passwordInput.focus();
        }
    };
    
    const runToolControlLogic = () => {
        if(toolAppInitialized) return;
        toolAppInitialized = true;
        
        const toolRef = database.ref('ferramentas');
        let toolsData = {};
        let employeesData = {};
        let projectsData = {};

        // Modals
        const toolItemModal = document.getElementById('tool-item-modal');
        const toolAssignModal = document.getElementById('tool-assign-modal');
        const toolMaintenanceModal = document.getElementById('tool-maintenance-modal');
        const toolHistoryModal = document.getElementById('tool-history-modal');

        // Forms and other elements
        const toolItemForm = document.getElementById('tool-item-form');
        const toolAssignForm = document.getElementById('tool-assign-form');
        const toolMaintenanceForm = document.getElementById('tool-maintenance-form');
        const toolTableBody = document.getElementById('tool-table-body');
        const filterToolName = document.getElementById('filter-tool-name');
        const filterToolCode = document.getElementById('filter-tool-code');
        const filterToolStatus = document.getElementById('filter-tool-status');
        const btnViewToolHistory = document.getElementById('btn-view-tool-history');
        const toolHistoryModalClose = document.getElementById('tool-history-modal-close');
        const selectToolHistory = document.getElementById('select-tool-history');
        const toolHistoryLog = document.getElementById('tool-history-log');

        const addToolHistory = (toolId, action) => {
            const historyEntry = {
                date: new Date().toISOString(),
                action: action,
            };
            toolRef.child(toolId).child('historico').push(historyEntry);
        };

        // Pre-carrega funcionários e obras
        database.ref('funcionarios').once('value', snapshot => { employeesData = snapshot.val() || {}; });
        database.ref('clientes').once('value', snapshot => { projectsData = snapshot.val() || {}; });

        const openModal = (modalId, data = {}) => {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            const form = modal.querySelector('form');
            if (form) form.reset();

            if (modalId === 'tool-item-modal') {
                modal.querySelector('#tool-item-modal-title').textContent = data.id ? 'Editar Ferramenta' : 'Adicionar Ferramenta';
                modal.querySelector('#tool-item-id').value = data.id || '';
                modal.querySelector('#tool-item-name').value = data.nome || '';
                modal.querySelector('#tool-item-brand').value = data.marca || '';
                modal.querySelector('#tool-item-model').value = data.modelo || '';
                modal.querySelector('#tool-item-code').value = data.codigo || '';
                modal.querySelector('#tool-item-buy-date').value = data.dataCompra || '';
                modal.querySelector('#tool-item-value').value = data.valor || '';
            } else if (modalId === 'tool-assign-modal') {
                modal.querySelector('#tool-assign-modal-title').textContent = `Alocar: ${data.nome}`;
                modal.querySelector('#tool-assign-id').value = data.id || '';
                
                const employeeSelect = modal.querySelector('#tool-assign-employee');
                const projectSelect = modal.querySelector('#tool-assign-project');
                
                employeeSelect.innerHTML = '<option value="">Selecione um funcionário</option>';
                for(const key in employeesData) { employeeSelect.innerHTML += `<option value="${employeesData[key].nome}">${employeesData[key].nome}</option>`; }

                projectSelect.innerHTML = '<option value="">Selecione uma obra</option>';
                for(const key in projectsData) { projectSelect.innerHTML += `<option value="${projectsData[key].nome}">${projectsData[key].nome}</option>`; }

                modal.querySelector('#tool-assign-date').value = new Date().toISOString().split('T')[0];
            } else if(modalId === 'tool-maintenance-modal') {
                modal.querySelector('#tool-maintenance-modal-title').textContent = `Manutenção: ${data.nome}`;
                modal.querySelector('#tool-maintenance-id').value = data.id || '';
                modal.querySelector('#tool-maintenance-next-date').value = data.proximaManutencao || '';
            }
            modal.style.display = 'block';
        };

        const closeToolModals = () => {
            toolItemModal.style.display = 'none';
            toolAssignModal.style.display = 'none';
            toolMaintenanceModal.style.display = 'none';
            toolHistoryModal.style.display = 'none';
        };

        document.getElementById('btn-add-tool').addEventListener('click', () => openModal('tool-item-modal'));
        document.getElementById('tool-item-modal-close').addEventListener('click', closeToolModals);
        document.getElementById('tool-assign-modal-close').addEventListener('click', closeToolModals);
        document.getElementById('tool-maintenance-modal-close').addEventListener('click', closeToolModals);
        toolHistoryModalClose.addEventListener('click', closeToolModals);
        
        toolItemForm.addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('tool-item-id').value;
            const data = {
                nome: document.getElementById('tool-item-name').value,
                marca: document.getElementById('tool-item-brand').value,
                modelo: document.getElementById('tool-item-model').value,
                codigo: document.getElementById('tool-item-code').value,
                dataCompra: document.getElementById('tool-item-buy-date').value,
                valor: parseFloat(document.getElementById('tool-item-value').value) || 0,
            };
            
            let promise;
            if (id) {
                promise = toolRef.child(id).update(data);
                addToolHistory(id, `Dados da ferramenta atualizados.`);
            } else {
                data.status = 'Disponível';
                promise = toolRef.push(data).then(newRef => {
                    addToolHistory(newRef.key, `Ferramenta criada com status 'Disponível'.`);
                });
            }
            promise.then(closeToolModals).catch(err => console.error(err));
        });
        
        toolAssignForm.addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('tool-assign-id').value;
            const employee = document.getElementById('tool-assign-employee').value;
            const project = document.getElementById('tool-assign-project').value;
            const updates = {
                status: 'Em Uso',
                responsavel: employee,
                local: project,
                dataRetirada: document.getElementById('tool-assign-date').value,
            };
            toolRef.child(id).update(updates).then(() => {
                addToolHistory(id, `Alocada para ${employee} na obra ${project}.`);
                closeToolModals();
            });
        });
        
        toolMaintenanceForm.addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('tool-maintenance-id').value;
            const oldTool = toolsData[id];
            const status = document.getElementById('tool-maintenance-status').value;
            const updates = {
                status: status,
                proximaManutencao: document.getElementById('tool-maintenance-next-date').value,
                responsavel: status === 'Disponível' ? null : oldTool.responsavel,
                local: status === 'Disponível' ? null : oldTool.local,
            };
            toolRef.child(id).update(updates).then(() => {
                addToolHistory(id, `Status alterado de '${oldTool.status}' para '${status}'.`);
                closeToolModals();
            });
        });

        const renderToolTable = () => {
            const nameQuery = filterToolName.value.toLowerCase();
            const codeQuery = filterToolCode.value.toLowerCase();
            const statusQuery = filterToolStatus.value;
            toolTableBody.innerHTML = '';
            
            Object.entries(toolsData).filter(([_, tool]) => {
                const nameMatch = (tool.nome || '').toLowerCase().includes(nameQuery);
                const codeMatch = (tool.codigo || '').toLowerCase().includes(codeQuery);
                const statusMatch = statusQuery === 'all' || tool.status === statusQuery;
                return nameMatch && codeMatch && statusMatch;
            }).forEach(([id, tool]) => {
                const row = toolTableBody.insertRow();
                let statusColorClass = '';
                 switch (tool.status) {
                    case 'Disponível': statusColorClass = 'status-dot-green'; break;
                    case 'Em Uso': statusColorClass = 'status-dot-yellow'; break;
                    case 'Em Manutenção': statusColorClass = 'status-dot-red'; break;
                }
                
                if(tool.status === 'Em Manutenção') {
                    row.className = 'maintenance-due';
                }

                let location = 'Depósito';
                if(tool.status === 'Em Uso') {
                    location = `${tool.responsavel} @ ${tool.local}`;
                } else if(tool.status === 'Em Manutenção') {
                    location = 'Manutenção';
                }

                row.innerHTML = `
                    <td data-label="Ferramenta">${tool.nome || 'N/A'}</td>
                    <td data-label="Código">${tool.codigo || 'N/A'}</td>
                    <td data-label="Status"><div><span class="status-dot ${statusColorClass}"></span><span>${tool.status || 'N/A'}</span></div></td>
                    <td data-label="Local/Responsável">${location}</td>
                    <td data-label="Ações">
                        <button class="btn-status btn-edit-tool" data-id="${id}" title="Editar"><i data-lucide="edit"></i></button>
                        <button class="btn-status btn-assign-tool" data-id="${id}" title="Alocar" ${tool.status !== 'Disponível' ? 'disabled' : ''}><i data-lucide="arrow-right-left"></i></button>
                        <button class="btn-status btn-return-tool" data-id="${id}" title="Devolver" ${tool.status !== 'Em Uso' ? 'disabled' : ''}><i data-lucide="undo-2"></i></button>
                        <button class="btn-status btn-maintenance-tool" data-id="${id}" title="Manutenção"><i data-lucide="wrench"></i></button>
                    </td>
                `;
            });
            lucide.createIcons();
        };
        
        const displayToolHistory = (toolId) => {
            toolHistoryLog.innerHTML = '<p>Carregando histórico...</p>';
            const selectedTool = toolsData[toolId];
            if (!selectedTool || !selectedTool.historico) {
                toolHistoryLog.innerHTML = '<p>Nenhum histórico encontrado para esta ferramenta.</p>';
                return;
            }

            const historyEntries = Object.values(selectedTool.historico).sort((a, b) => new Date(b.date) - new Date(a.date));
            
            toolHistoryLog.innerHTML = historyEntries.map(entry => {
                const date = new Date(entry.date).toLocaleString('pt-BR');
                return `<div class="history-item">
                    ${entry.action}
                    <span>${date}</span>
                </div>`;
            }).join('');
        };

        btnViewToolHistory.addEventListener('click', () => {
            selectToolHistory.innerHTML = '<option value="">Selecione uma ferramenta...</option>';
            Object.entries(toolsData).forEach(([id, tool]) => {
                const displayText = `${tool.nome} (${tool.codigo || 'S/C'})`;
                selectToolHistory.innerHTML += `<option value="${id}">${displayText}</option>`;
            });
            toolHistoryLog.innerHTML = '<p>Selecione uma ferramenta para ver seu histórico.</p>';
            toolHistoryModal.style.display = 'block';
        });

        selectToolHistory.addEventListener('change', () => {
            const selectedToolId = selectToolHistory.value;
            if (selectedToolId) {
                displayToolHistory(selectedToolId);
            } else {
                toolHistoryLog.innerHTML = '<p>Selecione uma ferramenta para ver seu histórico.</p>';
            }
        });
        
        toolRef.on('value', snapshot => {
            toolsData = {};
            const data = snapshot.val() || {};
            Object.keys(data).forEach(key => toolsData[key] = { ...data[key], id: key });
            renderToolTable();
        });

        [filterToolName, filterToolCode, filterToolStatus].forEach(el => el.addEventListener('input', renderToolTable));

        toolTableBody.addEventListener('click', (e) => {
            const button = e.target.closest('.btn-status');
            if (!button) return;
            const id = button.dataset.id;
            const tool = toolsData[id];
            
            if (button.classList.contains('btn-edit-tool')) {
                openModal('tool-item-modal', tool);
            } else if (button.classList.contains('btn-assign-tool')) {
                openModal('tool-assign-modal', tool);
            } else if (button.classList.contains('btn-maintenance-tool')) {
                openModal('tool-maintenance-modal', tool);
            } else if (button.classList.contains('btn-return-tool')) {
                const updates = { status: 'Disponível', responsavel: null, local: null, dataRetirada: null };
                toolRef.child(id).update(updates).then(() => {
                     addToolHistory(id, `Devolvida do status '${tool.status}'. Responsável anterior: ${tool.responsavel || 'N/A'}.`);
                });
            }
        });
    };


    // --- EVENT LISTENERS DE NAVEGAÇÃO PRINCIPAL ---
    btnGoToRentals.addEventListener('click', () => {
        showTopLevelView('rental-app-wrapper');
        initializeRentalApp();
    });

    btnGoToStock.addEventListener('click', () => {
        showTopLevelView('stock-control-wrapper');
        initializeStockControlApp();
    });
    
    btnGoToCars.addEventListener('click', () => {
        showTopLevelView('car-control-wrapper');
        initializeCarControlApp();
    });

    btnGoToTools.addEventListener('click', () => {
        showTopLevelView('tool-control-wrapper');
        initializeToolControlApp();
    });
    
    backToServicesButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showTopLevelView('service-selection-view');
            window.location.hash = ''; 
        });
    });

    // --- CARGA INICIAL ---
    showTopLevelView('service-selection-view');
    lucide.createIcons();
});
