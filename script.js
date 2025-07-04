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
    const allTopLevelViews = document.querySelectorAll('.top-level-view');
    const serviceSelectionView = document.getElementById('service-selection-view');
    
    const adminLoginView = document.getElementById('admin-login-view');
    const adminAppWrapper = document.getElementById('admin-app-wrapper');
    const adminMainContainer = document.getElementById('admin-main-container');
    const adminSystemViewContainer = document.getElementById('admin-system-view-container');
    
    const employeeAreaWrapper = document.getElementById('employee-area-wrapper');
    const employeeLoginView = document.getElementById('employee-login-view');
    const employeeDashboardView = document.getElementById('employee-dashboard-view');
    
    const btnGoToAdmin = document.getElementById('btn-go-to-admin');
    const btnGoToEmployeeArea = document.getElementById('btn-go-to-employee-area');
    const backToServicesButtons = document.querySelectorAll('.back-to-services-button');
    const logoutButton = document.querySelector('.logout-button');

    // Estado da Aplicação
    let funcionariosData = {};
    let adminsData = {};
    let activeSystemCleanup = () => {};

    // --- CARREGAMENTO DE DADOS GLOBAIS ---
    function loadInitialData() {
        database.ref('funcionarios').on('value', snapshot => {
            funcionariosData = snapshot.val() || {};
            renderEmployeeManagementTable();
            populateEmployeeLoginDropdown();
        });
        database.ref('admins').on('value', snapshot => {
            adminsData = snapshot.val() || {};
            populateAdminLoginDropdown();
            renderAdminManagementTable();
        });
    }

    // --- GERENCIADOR DE VIEWS ---
    function showTopLevelView(viewIdToShow) {
        allTopLevelViews.forEach(view => {
            view.style.display = 'none';
        });
        const viewToShow = document.getElementById(viewIdToShow);
        if (viewToShow) {
            viewToShow.style.display = (viewIdToShow === 'service-selection-view') ? 'flex' : 'block';
        }
    }

    function showAdminSubView(subViewName, systemKey = null, returnTo = 'adminDashboard') {
        activeSystemCleanup(); 

        if (subViewName === 'main') {
            adminMainContainer.style.display = 'block';
            adminSystemViewContainer.style.display = 'none';
            adminSystemViewContainer.innerHTML = '';
            document.querySelectorAll('#admin-main-container .system-button').forEach(button => {
                button.addEventListener('click', () => {
                    const system = button.dataset.system;
                    showAdminSubView('system', system, 'adminDashboard');
                });
            });
        } else if (subViewName === 'system' && systemKey) {
            const templateDiv = document.querySelector(`#system-templates [data-template="${systemKey}"]`);
            if (templateDiv) {
                adminSystemViewContainer.innerHTML = templateDiv.innerHTML;
                adminMainContainer.style.display = 'none';
                adminSystemViewContainer.style.display = 'block';

                switch(systemKey) {
                    case 'rental': activeSystemCleanup = runRentalAppLogic(); break;
                    case 'stock': activeSystemCleanup = runStockControlLogic(); break;
                    case 'car': activeSystemCleanup = runCarControlLogic(); break;
                    case 'tool': activeSystemCleanup = runToolControlLogic(); break;
                }

                 const backButton = adminSystemViewContainer.querySelector('.back-to-admin-dashboard-button');
                 if(backButton) {
                     backButton.addEventListener('click', () => {
                        if (returnTo === 'employeeDashboard') {
                            showTopLevelView('employee-area-wrapper');
                            employeeLoginView.style.display = 'none';
                            employeeDashboardView.style.display = 'block';
                        } else {
                            showTopLevelView('admin-app-wrapper');
                            showAdminSubView('main');
                        }
                     });
                 }
            } else {
                console.error(`Template do sistema não encontrado: ${systemKey}`);
                showAdminSubView('main');
            }
        }
    }

    // --- NAVEGAÇÃO PRINCIPAL E SESSÃO ---
    const goHome = () => {
        sessionStorage.removeItem('loggedInAdminId');
        sessionStorage.removeItem('loggedInEmployeeId');
        showAdminSubView('main');
        showTopLevelView('service-selection-view');
        adminLoginView.style.display = 'block';
        if(document.getElementById('admin-login-form')) {
            document.getElementById('admin-login-form').reset();
        }
        employeeLoginView.style.display = 'block';
        employeeDashboardView.style.display = 'none';
        if(document.getElementById('employee-login-form')) {
            document.getElementById('employee-login-form').reset();
        }
    };

    btnGoToAdmin.addEventListener('click', () => {
        showTopLevelView('admin-login-view');
        initializeAdminLogin();
    });

    btnGoToEmployeeArea.addEventListener('click', () => {
        showTopLevelView('employee-area-wrapper');
        initializeEmployeeArea();
    });

    backToServicesButtons.forEach(button => button.addEventListener('click', goHome));
    
    adminAppWrapper.querySelector('.back-to-services-button').addEventListener('click', goHome);


    // --- ÁREA DO ADMIN ---
    function initializeAdminLogin() {
        const adminLoginForm = document.getElementById('admin-login-form');
        const adminUserSelect = document.getElementById('admin-user-select');
        const adminPasswordInput = document.getElementById('admin-password-input');
        const adminLoginError = document.getElementById('admin-login-error');
        
        adminLoginForm.onsubmit = function(e) {
            e.preventDefault();
            const selectedUserId = adminUserSelect.value;
            const password = adminPasswordInput.value;
            let user = null;

            if (selectedUserId === 'ADMIN') {
                if (password === 'admin') {
                    user = { 
                        nome: 'ADMIN', 
                        permissions: { 
                            canManageAdmins: true, 
                            canManageEmployees: true, 
                            canViewRental: true,
                            canViewStock: true,
                            canViewCar: true,
                            canViewTool: true,
                            canViewApproval: true
                        } 
                    };
                }
            } else {
                const adminUser = adminsData[selectedUserId];
                if (adminUser && adminUser.senha === password) {
                    user = adminUser;
                }
            }
            
            if (user) {
                adminLoginError.textContent = '';
                sessionStorage.setItem('loggedInAdminId', selectedUserId);
                sessionStorage.setItem('loggedInAdminPermissions', JSON.stringify(user.permissions));
                showTopLevelView('admin-app-wrapper');
                initializeAdminApp(user);
            } else {
                adminLoginError.textContent = 'Usuário ou senha incorreta.';
                adminPasswordInput.focus();
            }
        }
    }

    function initializeAdminApp(adminUser) {
        showAdminSubView('main');
        
        const permissions = adminUser.permissions || {};
        
        document.getElementById('admin-management-section').style.display = permissions.canManageAdmins ? 'block' : 'none';
        document.getElementById('employee-management-section').style.display = permissions.canManageEmployees ? 'block' : 'none';

        document.querySelector('button[data-system="rental"]').style.display = permissions.canViewRental ? 'inline-flex' : 'none';
        document.querySelector('button[data-system="stock"]').style.display = permissions.canViewStock ? 'inline-flex' : 'none';
        document.querySelector('button[data-system="car"]').style.display = permissions.canViewCar ? 'inline-flex' : 'none';
        document.querySelector('button[data-system="tool"]').style.display = permissions.canViewTool ? 'inline-flex' : 'none';
        document.getElementById('btn-produtos-aprovacao').style.display = permissions.canViewApproval ? 'inline-flex' : 'none';


        document.getElementById('admin-dashboard-title').textContent = `Painel de ${adminUser.nome}`;
        
        renderEmployeeManagementTable();
        renderAdminManagementTable();

        const systemButtons = document.querySelectorAll('#admin-main-container .system-button');
        systemButtons.forEach(button => {
            button.addEventListener('click', () => {
                const systemKey = button.dataset.system;
                showAdminSubView('system', systemKey, 'adminDashboard');
            });
        });

        const btnProdutosAprovacao = document.getElementById('btn-produtos-aprovacao');
        if (btnProdutosAprovacao) {
            btnProdutosAprovacao.addEventListener('click', () => {
                window.open('produtos.html', '_blank');
            });
        }
        
        document.getElementById('btn-add-admin').addEventListener('click', () => openAdminPermissionModal());
    }
    
    function populateAdminLoginDropdown() {
        const adminSelect = document.getElementById('admin-user-select');
        if(!adminSelect) return;
        const currentVal = adminSelect.value;
        adminSelect.innerHTML = '<option value="ADMIN">ADMIN (Principal)</option>';
        if (adminsData) {
            Object.keys(adminsData).sort((a,b) => (adminsData[a].nome || '').localeCompare(adminsData[b].nome || '')).forEach(id => {
                adminSelect.innerHTML += `<option value="${id}">${adminsData[id].nome}</option>`;
            });
        }
        adminSelect.value = currentVal;
    }

    function renderAdminManagementTable() {
        const tableBody = document.getElementById('admin-management-table-body');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (adminsData) {
            Object.keys(adminsData).sort((a, b) => (adminsData[a].nome || '').localeCompare(adminsData[b].nome || '')).forEach(id => {
                const admin = adminsData[id];
                const row = tableBody.insertRow();
                row.innerHTML = `
                    <td data-label="Admin">${admin.nome}</td>
                    <td data-label="Ações">
                        <button class="action-button secondary btn-edit-admin-permissions" data-id="${id}" title="Editar Acessos">
                            <i data-lucide="key-round"></i>
                        </button>
                        <button class="action-button danger btn-delete-admin" data-id="${id}" title="Excluir Admin">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
            });
        }
        lucide.createIcons();
        
        document.querySelectorAll('.btn-edit-admin-permissions').forEach(btn => {
            btn.onclick = (e) => openAdminPermissionModal(e.currentTarget.dataset.id);
        });
        document.querySelectorAll('.btn-delete-admin').forEach(btn => {
            btn.onclick = (e) => deleteAdmin(e.currentTarget.dataset.id);
        });
    }
    
    function openAdminPermissionModal(adminId = null) {
        const modal = document.getElementById('admin-permission-modal');
        const title = document.getElementById('admin-permission-modal-title');
        const form = document.getElementById('admin-permission-form');
        const checkboxesContainer = document.getElementById('admin-permissions-checkboxes');
        const passwordInput = document.getElementById('permission-admin-password');
        
        form.reset();
        document.getElementById('permission-admin-id').value = adminId || '';
        
        const allPermissions = {
            canManageAdmins: "Gerenciar Admins",
            canManageEmployees: "Gerenciar Funcionários",
            canViewRental: "Ver Gerenciador de Obras",
            canViewStock: "Ver Controle de Estoque",
            canViewCar: "Ver Controle de Carros",
            canViewTool: "Ver Controle de Ferramentas",
            canViewApproval: "Ver Produtos para Aprovação"
        };

        if (adminId) {
            const admin = adminsData[adminId];
            title.textContent = `Editar Admin: ${admin.nome}`;
            document.getElementById('permission-admin-name').value = admin.nome;
            passwordInput.placeholder = "Deixe em branco para não alterar";
            
            const currentPermissions = admin.permissions || {};
            checkboxesContainer.innerHTML = Object.keys(allPermissions).map(key => `
                <div class="form-group">
                    <label style="flex-direction: row; align-items: center; display: flex; gap: 8px;">
                        <input type="checkbox" id="admin-perm-${key}" name="${key}" ${currentPermissions[key] ? 'checked' : ''}>
                        ${allPermissions[key]}
                    </label>
                </div>
            `).join('');
        } else {
            title.textContent = 'Criar Novo Admin';
            passwordInput.placeholder = "Senha é obrigatória";
            checkboxesContainer.innerHTML = Object.keys(allPermissions).map(key => `
                <div class="form-group">
                    <label style="flex-direction: row; align-items: center; display: flex; gap: 8px;">
                        <input type="checkbox" id="admin-perm-${key}" name="${key}">
                        ${allPermissions[key]}
                    </label>
                </div>
            `).join('');
        }
        
        modal.style.display = 'block';
    }

    document.getElementById('admin-permission-modal-close').onclick = () => {
        document.getElementById('admin-permission-modal').style.display = 'none';
    };

    document.getElementById('admin-permission-form').onsubmit = function(e) {
        e.preventDefault();
        const adminId = document.getElementById('permission-admin-id').value;
        const name = document.getElementById('permission-admin-name').value;
        const password = document.getElementById('permission-admin-password').value;

        if (!adminId && !password) {
            alert('A senha é obrigatória para novos administradores.');
            return;
        }

        const permissions = {};
        document.querySelectorAll('#admin-permissions-checkboxes input').forEach(cb => {
            permissions[cb.name] = cb.checked;
        });

        const adminData = { nome: name, permissions: permissions };
        if (password) {
            adminData.senha = password;
        }

        const ref = adminId ? database.ref('admins/' + adminId) : database.ref('admins').push();
        ref.update(adminData).then(() => {
            alert('Admin salvo com sucesso!');
            document.getElementById('admin-permission-modal').style.display = 'none';
        }).catch(err => {
            console.error(err);
            alert('Erro ao salvar admin.');
        });
    };
    
    function deleteAdmin(adminId) {
        if (confirm(`Tem certeza que deseja excluir o admin ${adminsData[adminId].nome}?`)) {
            database.ref('admins/' + adminId).remove()
                .then(() => alert('Admin excluído com sucesso.'))
                .catch(err => alert('Erro ao excluir admin.'));
        }
    }

    function populateEmployeeLoginDropdown() {
        const employeeSelect = document.getElementById('employee-select-login');
        if(!employeeSelect) return;
        const currentVal = employeeSelect.value;
        employeeSelect.innerHTML = '<option value="">Selecione o seu nome</option>';
        if (funcionariosData && Object.keys(funcionariosData).length > 0) {
            Object.keys(funcionariosData).sort((a, b) => (funcionariosData[a].nome || '').localeCompare(funcionariosData[b].nome || '')).forEach(id => {
                employeeSelect.innerHTML += `<option value="${id}">${funcionariosData[id].nome}</option>`;
            });
        } else {
            employeeSelect.innerHTML = '<option value="">Nenhum funcionário encontrado</option>';
        }
        employeeSelect.value = currentVal;
    }

    function renderEmployeeManagementTable() {
        const tableBody = document.getElementById('admin-employee-table-body');
        if (!tableBody) return;
        
        const loggedInAdminId = sessionStorage.getItem('loggedInAdminId');
        
        tableBody.innerHTML = '';
        if (funcionariosData) {
            Object.keys(funcionariosData).sort((a, b) => {
                const nomeA = funcionariosData[a].nome || '';
                const nomeB = funcionariosData[b].nome || '';
                return nomeA.localeCompare(nomeB);
            }).forEach(id => {
                const funcionario = funcionariosData[id];
                const row = tableBody.insertRow();
                
                let actionsHtml = '';
                if (loggedInAdminId === 'ADMIN') {
                    actionsHtml += `
                        <button class="action-button secondary btn-edit-permissions" data-id="${id}" title="Editar Acessos">
                            <i data-lucide="key-round"></i>
                        </button>
                    `;
                }
                actionsHtml += `
                    <button class="action-button btn-add-reminder" data-id="${id}" data-name="${funcionario.nome}" title="Adicionar Lembrete">
                        <i data-lucide="bell-plus"></i>
                    </button>
                `;

                row.innerHTML = `
                    <td data-label="Funcionário">${funcionario.nome}</td>
                    <td data-label="Ações">${actionsHtml}</td>
                `;
            });
        }
        lucide.createIcons();
        
        document.querySelectorAll('.btn-edit-permissions').forEach(btn => {
            btn.onclick = (e) => openPermissionModal(e.currentTarget.dataset.id);
        });

        document.querySelectorAll('.btn-add-reminder').forEach(btn => {
            btn.onclick = (e) => openReminderModal(e.currentTarget.dataset.id, e.currentTarget.dataset.name);
        });
    }

    function openPermissionModal(employeeId) {
        const modal = document.getElementById('employee-permission-modal');
        const title = document.getElementById('employee-permission-title');
        const form = document.getElementById('employee-permission-form');
        const checkboxesContainer = document.getElementById('permissions-checkboxes');
        
        const employee = funcionariosData[employeeId];
        title.textContent = `Editar Acessos de: ${employee.nome}`;
        document.getElementById('permission-employee-id').value = employeeId;
        form.reset();

        const permissions = employee.permissions || {};
        const allPermissions = {
            canViewRentals: "Ver Gerenciador de Obras",
            canViewStock: "Ver Controle de Estoque",
            canManageStock: "Gerenciar Estoque (Acesso Total)",
            canViewCars: "Ver Controle de Carros",
            canViewTools: "Ver Controle de Ferramentas"
        };

        checkboxesContainer.innerHTML = '';
        Object.keys(allPermissions).forEach(key => {
            const checked = permissions[key] ? 'checked' : '';
            checkboxesContainer.innerHTML += `
                <div class="form-group">
                    <label style="flex-direction: row; align-items: center; display: flex; gap: 8px;">
                        <input type="checkbox" id="perm-${key}" name="${key}" ${checked}>
                        ${allPermissions[key]}
                    </label>
                </div>
            `;
        });
        
        modal.style.display = 'block';
    }

    document.getElementById('employee-permission-modal-close').onclick = () => {
        document.getElementById('employee-permission-modal').style.display = 'none';
    };

    document.getElementById('employee-permission-form').onsubmit = function(e) {
        e.preventDefault();
        const employeeId = document.getElementById('permission-employee-id').value;
        const newPassword = document.getElementById('permission-employee-password').value;
        
        const updates = {};
        if (newPassword && newPassword.trim() !== '') {
            updates[`funcionarios/${employeeId}/senha`] = newPassword;
        }

        const permissions = {};
        document.querySelectorAll('#permissions-checkboxes input[type="checkbox"]').forEach(cb => {
            permissions[cb.name] = cb.checked;
        });
        updates[`funcionarios/${employeeId}/permissions`] = permissions;

        database.ref().update(updates).then(() => {
            alert('Acessos atualizados com sucesso!');
            document.getElementById('employee-permission-modal').style.display = 'none';
        }).catch(err => {
            console.error(err);
            alert('Erro ao atualizar acessos.');
        });
    };

    function openReminderModal(employeeId, employeeName) {
        const modal = document.getElementById('reminder-modal');
        const form = document.getElementById('reminder-form');
        form.reset();
        document.getElementById('reminder-employee-id').value = employeeId;
        document.getElementById('reminder-employee-name').value = employeeName;
        modal.style.display = 'block';
    }

    document.getElementById('reminder-modal-close').onclick = () => {
        document.getElementById('reminder-modal').style.display = 'none';
    };
    
    document.getElementById('description-modal-close').onclick = () => {
        document.getElementById('description-modal').style.display = 'none';
    };

    document.getElementById('reminder-form').onsubmit = function(e) {
        e.preventDefault();
        const employeeId = document.getElementById('reminder-employee-id').value;
        const message = document.getElementById('reminder-message').value;
        const priority = document.getElementById('reminder-priority').value;
        const expiresAt = document.getElementById('reminder-expires-at').value;

        const reminderData = {
            message,
            priority,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            expiresAt: expiresAt || null
        };

        database.ref(`lembretes/${employeeId}`).push(reminderData).then(() => {
            alert('Lembrete enviado com sucesso!');
            document.getElementById('reminder-modal').style.display = 'none';
        }).catch(err => {
            console.error("Erro ao enviar lembrete:", err);
            alert("Erro ao enviar lembrete.");
        });
    };

    // --- ÁREA DO FUNCIONÁRIO ---
    function initializeEmployeeArea() {
        populateEmployeeLoginDropdown();
        document.getElementById('employee-login-form').onsubmit = function(e) {
            e.preventDefault();
            const employeeId = document.getElementById('employee-select-login').value;
            const password = document.getElementById('employee-password-input').value;
            const errorP = document.getElementById('employee-login-error');

            if (!employeeId) {
                errorP.textContent = 'Por favor, selecione o seu nome.';
                return;
            }

            const employee = funcionariosData[employeeId];
            if (employee && employee.senha && employee.senha === password) {
                sessionStorage.setItem('loggedInEmployeeId', employeeId);
                employeeLoginView.style.display = 'none';
                renderEmployeeDashboard(employeeId);
                employeeDashboardView.style.display = 'block';
                errorP.textContent = '';
            } else {
                errorP.textContent = 'Nome ou senha incorretos.';
            }
        };
    }
    
    function createDetailCard({ title, subtitle, details, indicatorClass = '', footerHtml = '', observacao = '' }) {
        let detailsHtml = Object.entries(details).map(([key, value]) => `
            <div class="car-card-item" style="font-size: 0.9rem;">
                <strong style="color: var(--text-primary);">${key}:</strong> 
                <span style="color: var(--text-secondary);">${value}</span>
            </div>
        `).join('');

        if (observacao) {
            detailsHtml += `
                <div class="car-card-item" style="font-size: 0.9rem; grid-column: span 2; display: flex; align-items: center; gap: 8px;">
                     <strong style="color: var(--text-primary);">Obs:</strong>
                     <button class="btn-status btn-show-description" data-description="${observacao}" title="Ver Descrição"><i data-lucide="info"></i></button>
                </div>
            `;
        }

        const indicatorHtml = indicatorClass ? `<div class="status-indicators"><div class="indicator-bar ${indicatorClass}" title="Status"></div></div>` : '';
        const footerSection = footerHtml ? `<div class="car-card-footer">${footerHtml}</div>` : '';

        return `
            <div class="car-card">
                ${indicatorHtml}
                <div class="car-card-content" style="width: 100%;">
                    <div class="car-card-header">
                        <h3>${title}</h3>
                        <p>${subtitle}</p>
                    </div>
                    <div class="car-card-body" style="grid-template-columns: 1fr; gap: 0.75rem;">
                        ${detailsHtml}
                    </div>
                    ${footerSection}
                </div>
            </div>
        `;
    }

    async function handleEmployeeKmUpdate(carId) {
        const carSnapshot = await database.ref(`veiculos/${carId}`).once('value');
        const carData = { ...carSnapshot.val(), id: carId };
        
        const updateKmModal = document.getElementById('car-update-km-modal');
        const updateKmForm = document.getElementById('car-update-km-form');
        
        updateKmModal.querySelector('#car-update-km-modal-title').textContent = `Atualizar KM de ${carData.nome}`;
        updateKmModal.querySelector('#car-update-km-id').value = carId;
        updateKmForm.reset();

        updateKmForm.onsubmit = (e) => {
            e.preventDefault();
            const newKm = parseInt(updateKmForm.querySelector('#car-update-km-input').value);
            if (newKm >= (carData.kmAtual || 0)) {
                database.ref(`veiculos/${carId}`).update({ kmAtual: newKm }).then(() => {
                    updateKmModal.style.display = 'none';
                    renderEmployeeDashboard(sessionStorage.getItem('loggedInEmployeeId'));
                });
            } else {
                alert('A nova quilometragem deve ser maior ou igual à atual.');
            }
        };

        updateKmModal.style.display = 'block';
    }
    
    const carUpdateKmModal = document.getElementById('car-update-km-modal');
    const carUpdateKmModalClose = document.getElementById('car-update-km-modal-close');
    if(carUpdateKmModal && carUpdateKmModalClose) {
        carUpdateKmModalClose.onclick = () => carUpdateKmModal.style.display = 'none';
    }

    async function renderEmployeeDashboard(employeeId) {
        const employee = funcionariosData[employeeId];
        document.getElementById('employee-dashboard-title').textContent = `Bem-vindo(a), ${employee.nome}`;
        
        renderReminders(employeeId);
        renderWeeklyEvents(employeeId);
        renderEmployeeCards(employeeId);
    }

    async function renderReminders(employeeId) {
        const remindersRef = database.ref(`lembretes/${employeeId}`);
        const remindersContainer = document.getElementById('reminders-container');
        if (!remindersContainer) return;

        remindersRef.on('value', snapshot => {
            remindersContainer.innerHTML = '';
            const reminders = snapshot.val();
            if (!reminders) {
                remindersContainer.style.display = 'none';
                return;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const activeReminders = Object.entries(reminders).filter(([,r]) => {
                if (!r.expiresAt) return true;
                const expiresDate = new Date(r.expiresAt + 'T03:00:00Z');
                return expiresDate >= today;
            });

            if (activeReminders.length === 0) {
                 remindersContainer.style.display = 'none';
                 return;
            }

            remindersContainer.style.display = 'block';
            remindersContainer.innerHTML = `<h2 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;"><i data-lucide="bell"></i> Lembretes</h2>`;

            const priorityOrder = { 'alta': 1, 'media': 2, 'baixa': 3 };
            activeReminders.sort(([, a], [, b]) => priorityOrder[a.priority] - priorityOrder[b.priority]);

            activeReminders.forEach(([key, reminder]) => {
                const card = document.createElement('div');
                card.className = `reminder-card priority-${reminder.priority}`;
                card.innerHTML = `<p>${reminder.message}</p>`;
                remindersContainer.appendChild(card);
            });
            lucide.createIcons();
        });
    }
    
    async function renderWeeklyEvents(employeeId) {
        const container = document.getElementById('weekly-events-container');
        if (!container) return;

        const permissions = funcionariosData[employeeId]?.permissions || {};
        const weeklyEvents = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const firstDayOfWeek = new Date(today);
        firstDayOfWeek.setDate(today.getDate() - today.getDay());
        firstDayOfWeek.setHours(0, 0, 0, 0);

        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        lastDayOfWeek.setHours(23, 59, 59, 999);

        if (permissions.canViewRentals) {
            const rentalsSnapshot = await database.ref('lancamentos').orderByChild('funcionarioId').equalTo(employeeId).once('value');
            const rentalsData = rentalsSnapshot.val() || {};
            Object.values(rentalsData).forEach(item => {
                if (item.status !== 'Devolvido') {
                    const proximoVencimentoStr = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                    if (proximoVencimentoStr) {
                        const proximoVencimentoDate = new Date(proximoVencimentoStr + 'T03:00:00Z');
                        if (proximoVencimentoDate >= firstDayOfWeek && proximoVencimentoDate <= lastDayOfWeek) {
                            weeklyEvents.push({
                                date: proximoVencimentoDate,
                                type: 'locacao',
                                title: `Vencimento: ${item.equipamentoNome}`,
                                description: `Cliente: ${item.clienteNome} | CTR: ${item.ctr}`
                            });
                        }
                    }
                }
            });
        }

        const remindersRef = database.ref(`lembretes/${employeeId}`);
        const remindersSnapshot = await remindersRef.once('value');
        const reminders = remindersSnapshot.val() || {};
        
        Object.values(reminders).forEach(reminder => {
            if (reminder.expiresAt) {
                const expiresDate = new Date(reminder.expiresAt + 'T03:00:00Z');
                if (expiresDate >= firstDayOfWeek && expiresDate <= lastDayOfWeek) {
                     weeklyEvents.push({
                        date: expiresDate,
                        type: 'lembrete',
                        title: `Lembrete (${reminder.priority})`,
                        description: reminder.message
                    });
                }
            }
        });

        weeklyEvents.sort((a, b) => a.date - b.date);

        container.innerHTML = '';
        let eventsHtml = `<h2 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;"><i data-lucide="calendar-days"></i> Eventos da Semana</h2>`;
        
        if (weeklyEvents.length > 0) {
            eventsHtml += '<div class="events-list-container">';
            
            weeklyEvents.forEach(event => {
                eventsHtml += `
                    <div class="event-item event-type-${event.type}" style="padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                        <strong>${event.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} - ${event.title}</strong>
                        <p>${event.description}</p>
                    </div>
                `;
            });

            eventsHtml += '</div>';
        } else {
            eventsHtml += `<p>Nenhum evento agendado para esta semana.</p>`;
        }
        
        container.innerHTML = eventsHtml;
        lucide.createIcons();
    }

    function calcularProximoVencimento(dataInicioStr, frequencia, reagendamentoAutomatico) {
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

    async function renderEmployeeCards(employeeId) {
        const employee = funcionariosData[employeeId];
        const container = document.getElementById('employee-cards-container');
        if (!container) return;
        
        container.innerHTML = '';
        const permissions = employee.permissions || {};
        let finalHtml = '';
        let hasContent = false;

        const getDueDateStatus = (proximoVencimentoStr) => {
            if (!proximoVencimentoStr) return 'indicator-license-ok';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(proximoVencimentoStr + 'T03:00:00Z');
            const diffDays = Math.ceil((dueDate - today) / 864e5);
            
            if (diffDays <= 3) return 'indicator-license-danger';
            if (diffDays <= 7) return 'indicator-license-warning';
            return 'indicator-license-ok';
        };

        if (permissions.canViewRentals) {
            const rentalsSnapshot = await database.ref('lancamentos').orderByChild('funcionarioId').equalTo(employeeId).once('value');
            const rentalsData = rentalsSnapshot.val() || {};
            const activeRentals = Object.values(rentalsData).filter(item => item.status !== 'Devolvido');
            
            if (activeRentals.length > 0) {
                hasContent = true;
                let cardsHtml = activeRentals.sort((a,b) => (a.equipamentoNome || '').localeCompare(b.equipamentoNome || '')).map(item => {
                    const proximoVencimento = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                    const indicatorClass = getDueDateStatus(proximoVencimento);
                    return createDetailCard({
                        title: item.equipamentoNome,
                        subtitle: `Cliente: ${item.clienteNome}`,
                        details: {
                            'Nº CTR': item.ctr,
                            'Próximo Venc.': proximoVencimento ? new Date(proximoVencimento + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'
                        },
                        indicatorClass: indicatorClass,
                        observacao: item.observacao
                    });
                }).join('');
                finalHtml += `
                    <section class="dashboard-category" style="margin-bottom: 2.5rem; width: 100%;">
                        <h2 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;"><i data-lucide="building-2"></i> Locações</h2>
                        <div class="car-card-grid">${cardsHtml}</div>
                    </section>`;
            }
        }

        if (permissions.canViewCars) {
            const carsSnapshot = await database.ref('veiculos').orderByChild('condutor').equalTo(employee.nome).once('value');
            const carsData = carsSnapshot.val() || {};
            const userCars = Object.entries(carsData).map(([id, car]) => ({...car, id}));

            if(userCars.length > 0) {
                hasContent = true;
                let cardsHtml = userCars.sort((a,b) => (a.nome || '').localeCompare(b.nome || '')).map(car => {
                    const indicatorClass = getDueDateStatus(car.licenciamento);
                    const footer = `<button class="btn-status btn-update-km-employee" data-id="${car.id}" title="Atualizar KM"><i data-lucide="gauge-circle"></i> Atualizar KM</button>`;
                    return createDetailCard({
                        title: car.nome,
                        subtitle: `Placa: ${car.placa}`,
                        details: {
                            'KM Atual': (car.kmAtual || 0).toLocaleString('pt-BR'),
                            'Licenciamento': car.licenciamento ? new Date(car.licenciamento + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'
                        },
                        indicatorClass: indicatorClass,
                        footerHtml: footer
                    });
                }).join('');
                 finalHtml += `
                    <section class="dashboard-category" style="margin-bottom: 2.5rem; width: 100%;">
                        <h2 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;"><i data-lucide="car"></i> Meus Veículos</h2>
                        <div class="car-card-grid">${cardsHtml}</div>
                    </section>`;
            }
        }

        if (permissions.canViewTools) {
            const toolsSnapshot = await database.ref('ferramentas').orderByChild('responsavel').equalTo(employee.nome).once('value');
            const toolsData = toolsSnapshot.val() || {};
            const userTools = Object.values(toolsData).filter(tool => tool.status === 'Em Uso');

            if(userTools.length > 0) {
                hasContent = true;
                let cardsHtml = userTools.sort((a,b) => (a.nome || '').localeCompare(b.nome || '')).map(tool => {
                    return createDetailCard({
                        title: tool.nome,
                        subtitle: `Código: ${tool.codigo || 'S/C'}`,
                        details: {
                            'Obra de Destino': tool.local || 'N/A',
                            'Data de Retirada': tool.dataRetirada ? new Date(tool.dataRetirada + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'
                        },
                        indicatorClass: 'indicator-tool-inuse'
                    });
                }).join('');
                finalHtml += `
                    <section class="dashboard-category" style="margin-bottom: 2.5rem; width: 100%;">
                        <h2 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;"><i data-lucide="wrench"></i> Minhas Ferramentas</h2>
                        <div class="car-card-grid">${cardsHtml}</div>
                    </section>`;
            }
        }
        
        if (permissions.canViewStock || permissions.canManageStock) {
            hasContent = true;
            const buttonHtml = permissions.canManageStock 
                ? `<a href="#" id="employee-access-stock-btn" class="action-button secondary">Aceder ao Estoque</a>`
                : `<p style="margin: 0; font-style: italic;">Acesso apenas para visualização.</p>`;

            finalHtml += `
                <section class="dashboard-category" style="width: 100%;">
                    <h2 style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem;"><i data-lucide="boxes"></i> Acesso ao Estoque</h2>
                    <div style="background-color: var(--background-color); border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        <p style="margin: 0; flex-grow: 1;">Você tem permissão para ${permissions.canManageStock ? 'gerenciar' : 'visualizar'} o estoque.</p>
                        ${buttonHtml}
                    </div>
                </section>
            `;
        }
        
        container.innerHTML = finalHtml;
        if (!hasContent) {
            container.innerHTML += '<p>Você não tem nenhuma tarefa ou item alocado no momento.</p>';
        }

        lucide.createIcons();
        
        const accessStockBtn = document.getElementById('employee-access-stock-btn');
        if(accessStockBtn) {
            accessStockBtn.addEventListener('click', (e) => {
                e.preventDefault();
                showTopLevelView('admin-app-wrapper');
                showAdminSubView('system', 'stock', 'employeeDashboard');
            });
        }
        
        container.querySelectorAll('.btn-update-km-employee').forEach(btn => {
            btn.addEventListener('click', (e) => handleEmployeeKmUpdate(e.currentTarget.dataset.id));
        });

        container.querySelectorAll('.btn-show-description').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const descriptionModal = document.getElementById('description-modal');
                document.getElementById('description-modal-text').textContent = e.currentTarget.dataset.description;
                descriptionModal.style.display = 'block';
            });
        });
    }

    function setupEventListeners() {
        const listeners = [];
        const firebaseRefs = [];

        const addTrackedListener = (element, event, handler) => {
            if (element) {
                element.addEventListener(event, handler);
                listeners.push({ element, event, handler });
            }
        };

        const trackFirebaseRef = (ref) => {
            if (ref) firebaseRefs.push(ref);
        };
        
        const cleanup = () => {
            listeners.forEach(({ element, event, handler }) => {
                if (element) element.removeEventListener(event, handler);
            });
            firebaseRefs.forEach(ref => ref.off());
        };

        return { addTrackedListener, trackFirebaseRef, cleanup };
    }

    // --- INICIALIZAÇÃO ---
    showTopLevelView('service-selection-view');
    loadInitialData();
    lucide.createIcons();


    // ######################################################################
    //  FUNÇÕES DE LÓGICA DE CADA SISTEMA (dentro do admin)
    // ######################################################################

    // =====================================================================
    //  1. GERENCIADOR DE OBRAS
    // =====================================================================
    function runRentalAppLogic() {
        const { addTrackedListener, trackFirebaseRef, cleanup } = setupEventListeners();
        const container = adminSystemViewContainer;
        
        const genericModal = document.getElementById('genericModal');
        const statusModal = document.getElementById('statusModal');
        const editRentalModal = container.querySelector('#edit-rental-modal');

        const modalTitle = document.getElementById('modalTitle');
        const modalFields = document.getElementById('modalFields');
        const modalForm = document.getElementById('modalForm');
        const mainForm = container.querySelector('#main-form');
        const editRentalForm = container.querySelector('#edit-rental-form');

        const selectCliente = container.querySelector('#selectCliente');
        const inputEndereco = container.querySelector('#inputEndereco');
        const inputCidade = container.querySelector('#inputCidade');
        const selectFornecedor = container.querySelector('#selectFornecedor');
        const selectEquipamento = container.querySelector('#selectEquipamento');
        const selectFuncionario = container.querySelector('#selectFuncionario');
        
        const dataTableBody = container.querySelector('#dataTableBody');
        const filterCliente = container.querySelector('#filterCliente');
        const filterEquipamento = container.querySelector('#filterEquipamento');
        const filterFornecedor = container.querySelector('#filterFornecedor');
        const filterFuncionario = container.querySelector('#filterFuncionario');
        const filterStatus = container.querySelector('#filterStatus');

        const mainView = container.querySelector("#main-view");
        if(mainView) mainView.style.display = "block";

        let currentModalType = '';
        let clientesData = {};
        let currentStatusUpdateId = null;
        let lancamentosAtuais = {};
        
        const openGenericModal = (type) => {
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
            if(genericModal) genericModal.style.display = 'none';
            if(statusModal) statusModal.style.display = 'none';
            if(editRentalModal) editRentalModal.style.display = 'none';
            if (modalForm) modalForm.reset();
            if (editRentalForm) editRentalForm.reset();
        };
        
        addTrackedListener(document.getElementById('genericModalClose'), 'click', closeModal);
        addTrackedListener(document.getElementById('statusModal').querySelector('#btnStatusCancelar'), 'click', closeModal);
        addTrackedListener(container.querySelector('#edit-rental-modal-close'), 'click', closeModal);

        container.querySelectorAll('#btnNovaObra, #btnFastAddCliente').forEach(btn => addTrackedListener(btn, 'click', () => openGenericModal('clientes')));
        container.querySelectorAll('#btnNovoFornecedor, #btnFastAddFornecedor').forEach(btn => addTrackedListener(btn, 'click', () => openGenericModal('fornecedores')));
        container.querySelectorAll('#btnNovoEquipamento, #btnFastAddEquipamento').forEach(btn => addTrackedListener(btn, 'click', () => openGenericModal('equipamentos')));
        container.querySelectorAll('#btnNovoFuncionario, #btnFastAddFuncionario').forEach(btn => addTrackedListener(btn, 'click', () => openGenericModal('funcionarios')));

        addTrackedListener(modalForm, 'submit', (e) => {
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

        const populateSelect = (selectElement, data, placeholder) => {
            if (!selectElement) return;
            const selectedValue = selectElement.value;
            selectElement.innerHTML = `<option value="">${placeholder}</option>`;
            for (const key in data) { selectElement.innerHTML += `<option value="${key}">${data[key].nome}</option>`; }
            selectElement.value = selectedValue;
        }

        const loadAndPopulateAllSelects = () => {
            const refsToLoad = {
                clientes: database.ref('clientes'),
                fornecedores: database.ref('fornecedores'),
                equipamentos: database.ref('equipamentos'),
                funcionarios: database.ref('funcionarios')
            };

            const promises = Object.entries(refsToLoad).map(([key, ref]) => ref.once('value').then(snapshot => ({ key, data: snapshot.val() || {} })));

            Promise.all(promises).then(results => {
                const allData = results.reduce((acc, {key, data}) => ({...acc, [key]: data }), {});
                clientesData = allData.clientes;

                populateSelect(selectCliente, allData.clientes, 'Selecione uma obra');
                populateSelect(selectFornecedor, allData.fornecedores, 'Selecione um fornecedor');
                populateSelect(selectEquipamento, allData.equipamentos, 'Selecione um equipamento');
                populateSelect(selectFuncionario, allData.funcionarios, 'Selecione um funcionário');
                
                populateSelect(container.querySelector('#edit-selectCliente'), allData.clientes, 'Selecione uma obra');
                populateSelect(container.querySelector('#edit-selectFornecedor'), allData.fornecedores, 'Selecione um fornecedor');
                populateSelect(container.querySelector('#edit-selectEquipamento'), allData.equipamentos, 'Selecione um equipamento');
                populateSelect(container.querySelector('#edit-selectFuncionario'), allData.funcionarios, 'Selecione um funcionário');
            });
        };
        
        loadAndPopulateAllSelects();

        addTrackedListener(selectCliente, 'change', () => {
            const cliente = clientesData[selectCliente.value];
            if (inputEndereco) inputEndereco.value = cliente ? cliente.endereco : '';
            if (inputCidade) inputCidade.value = cliente ? cliente.cidade : '';
        });
        
        addTrackedListener(container.querySelector('#edit-selectCliente'), 'change', (e) => {
             const cliente = clientesData[e.target.value];
             const editEndereco = container.querySelector('#edit-inputEndereco');
             const editCidade = container.querySelector('#edit-inputCidade');
             if (editEndereco) editEndereco.value = cliente ? cliente.endereco : '';
             if (editCidade) editCidade.value = cliente ? cliente.cidade : '';
        });

        addTrackedListener(mainForm, 'submit', (e) => {
            e.preventDefault();
            const data = {
                clienteId: selectCliente.value, clienteNome: selectCliente.options[selectCliente.selectedIndex].text,
                fornecedorId: selectFornecedor.value, fornecedorNome: selectFornecedor.options[selectFornecedor.selectedIndex].text,
                equipamentoId: selectEquipamento.value, equipamentoNome: selectEquipamento.options[selectEquipamento.selectedIndex].text,
                funcionarioId: selectFuncionario.value, funcionarioNome: selectFuncionario.options[selectFuncionario.selectedIndex].text,
                ctr: container.querySelector('#inputCtr').value, valor: container.querySelector('#inputValor').value,
                observacao: container.querySelector('#inputObservacao').value, status: 'Locado',
                dataInicio: container.querySelector('#inputDataInicio').value, frequencia: container.querySelector('#selectFrequencia').value,
                reagendamentoAutomatico: container.querySelector('#selectFrequencia').value !== 'unico'
            };
            database.ref('lancamentos').push(data).then(() => { mainForm.reset(); inputEndereco.value = ''; inputCidade.value = ''; }).catch(error => console.error("Erro: ", error));
        });

        addTrackedListener(editRentalForm, 'submit', (e) => {
            e.preventDefault();
            const id = editRentalForm.querySelector('#edit-rental-id').value;
            if (!id) return;

            const editSelectCliente = container.querySelector('#edit-selectCliente');
            const editSelectFornecedor = container.querySelector('#edit-selectFornecedor');
            const editSelectEquipamento = container.querySelector('#edit-selectEquipamento');
            const editSelectFuncionario = container.querySelector('#edit-selectFuncionario');
            const editSelectFrequencia = container.querySelector('#edit-selectFrequencia');

            const data = {
                clienteId: editSelectCliente.value, clienteNome: editSelectCliente.options[editSelectCliente.selectedIndex].text,
                fornecedorId: editSelectFornecedor.value, fornecedorNome: editSelectFornecedor.options[editSelectFornecedor.selectedIndex].text,
                equipamentoId: editSelectEquipamento.value, equipamentoNome: editSelectEquipamento.options[editSelectEquipamento.selectedIndex].text,
                funcionarioId: editSelectFuncionario.value, funcionarioNome: editSelectFuncionario.options[editSelectFuncionario.selectedIndex].text,
                ctr: container.querySelector('#edit-inputCtr').value, 
                valor: container.querySelector('#edit-inputValor').value,
                observacao: container.querySelector('#edit-inputObservacao').value,
                dataInicio: container.querySelector('#edit-inputDataInicio').value, 
                frequencia: editSelectFrequencia.value,
                reagendamentoAutomatico: editSelectFrequencia.value !== 'unico'
            };

            database.ref('lancamentos/' + id).update(data).then(() => closeModal()).catch(err => console.error("Erro ao atualizar:", err));
        });

        const getDueDateStatus = (proximoVencimentoStr) => {
            if (!proximoVencimentoStr) return '';
            const diffDays = Math.ceil((new Date(proximoVencimentoStr + 'T03:00:00Z') - new Date().setHours(0,0,0,0)) / 864e5);
            if (diffDays <= 3) return 'due-urgent';
            if (diffDays <= 7) return 'due-soon';
            return 'due-ok';
        };

        const applyFiltersAndRender = () => {
            if (!dataTableBody) return;
            const queries = { 
                c: filterCliente.value.toLowerCase(), 
                e: filterEquipamento.value.toLowerCase(), 
                fo: filterFornecedor.value.toLowerCase(), 
                fu: filterFuncionario.value.toLowerCase(), 
                s: filterStatus.value 
            };
            dataTableBody.innerHTML = '';
            
            const filteredAndSortedKeys = Object.keys(lancamentosAtuais).filter(key => {
                const i = lancamentosAtuais[key];
                return i.status !== 'Devolvido' && 
                       (i.clienteNome || '').toLowerCase().includes(queries.c) && 
                       (i.equipamentoNome || '').toLowerCase().includes(queries.e) && 
                       (i.fornecedorNome || '').toLowerCase().includes(queries.fo) && 
                       (i.funcionarioNome || '').toLowerCase().includes(queries.fu) && 
                       (queries.s === 'all' || i.status === queries.s);
            }).sort((keyA, keyB) => {
                const nomeA = lancamentosAtuais[keyA].clienteNome || '';
                const nomeB = lancamentosAtuais[keyB].clienteNome || '';
                return nomeA.localeCompare(nomeB);
            });

            filteredAndSortedKeys.forEach(key => {
                const item = lancamentosAtuais[key];
                const proximoVencimentoStr = calcularProximoVencimento(item.dataInicio, item.frequencia, item.reagendamentoAutomatico);
                const row = dataTableBody.insertRow();
                row.className = getDueDateStatus(proximoVencimentoStr);
                const formatarFrequencia = (f) => ({ unico: 'Sem Reagendamento', diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }[f] || f || 'N/A');
                row.innerHTML = `<td>${item.clienteNome || ''}</td><td>${item.equipamentoNome || ''}</td><td>${item.fornecedorNome || ''}</td><td>${item.funcionarioNome || ''}</td><td>${item.ctr || ''}</td><td>R$ ${parseFloat(item.valor || 0).toFixed(2)}</td><td>${proximoVencimentoStr ? new Date(proximoVencimentoStr + 'T03:00:00Z').toLocaleDateString('pt-BR') : 'N/A'}</td><td>${formatarFrequencia(item.frequencia)}</td><td><span class="status status-${(item.status || "").toLowerCase()}">${item.status}</span></td>
                <td>
                    <button class="btn-status btn-edit-rental" data-id="${key}" title="Editar Lançamento"><i data-lucide="file-pen-line"></i></button>
                    <button class="btn-status btn-change-status" data-id="${key}" title="Alterar Status"><i data-lucide="edit"></i></button>
                </td>`;
            });
            lucide.createIcons();
        };

        const lancamentosRef = database.ref('lancamentos');
        trackFirebaseRef(lancamentosRef);
        lancamentosRef.on('value', (snapshot) => {
            lancamentosAtuais = snapshot.val() || {};
            applyFiltersAndRender();
        });
        
        [filterCliente, filterEquipamento, filterFornecedor, filterFuncionario, filterStatus].forEach(i => addTrackedListener(i, 'input', applyFiltersAndRender));

        addTrackedListener(dataTableBody, 'click', (e) => {
            const statusButton = e.target.closest('.btn-change-status');
            const editButton = e.target.closest('.btn-edit-rental');
            if (statusButton) { 
                currentStatusUpdateId = statusButton.dataset.id;
                statusModal.style.display = 'block'; 
            }
            if (editButton) {
                const rentalId = editButton.dataset.id;
                const item = lancamentosAtuais[rentalId];
                if(item) {
                    container.querySelector('#edit-rental-id').value = rentalId;
                    container.querySelector('#edit-selectCliente').value = item.clienteId;
                    container.querySelector('#edit-selectCliente').dispatchEvent(new Event('change'));
                    setTimeout(() => {
                        container.querySelector('#edit-inputEndereco').value = clientesData[item.clienteId]?.endereco || '';
                        container.querySelector('#edit-inputCidade').value = clientesData[item.clienteId]?.cidade || '';
                    }, 100);

                    container.querySelector('#edit-selectFornecedor').value = item.fornecedorId;
                    container.querySelector('#edit-selectEquipamento').value = item.equipamentoId;
                    container.querySelector('#edit-selectFuncionario').value = item.funcionarioId;
                    container.querySelector('#edit-inputCtr').value = item.ctr;
                    container.querySelector('#edit-inputValor').value = item.valor;
                    container.querySelector('#edit-inputDataInicio').value = item.dataInicio;
                    container.querySelector('#edit-selectFrequencia').value = item.frequencia;
                    container.querySelector('#edit-inputObservacao').value = item.observacao;
                    
                    editRentalModal.style.display = 'block';
                }
            }
        });

        addTrackedListener(document.getElementById('btnStatusParcial'), 'click', () => { if (currentStatusUpdateId) { database.ref('lancamentos/' + currentStatusUpdateId).update({ status: 'Parcial' }).then(closeModal); } });
        addTrackedListener(document.getElementById('btnStatusCompleto'), 'click', () => { if (currentStatusUpdateId) { database.ref('lancamentos/' + currentStatusUpdateId).update({ status: 'Devolvido' }).then(closeModal); } });
        
        return cleanup;
    }

    // =====================================================================
    //  2. CONTROLE DE ESTOQUE
    // =====================================================================
    function runStockControlLogic() {
        const { addTrackedListener, trackFirebaseRef, cleanup } = setupEventListeners();
        const container = adminSystemViewContainer;
        
        const stockRef = database.ref('estoque');
        trackFirebaseRef(stockRef);
        let stockItemsData = {};

        const itemModal = container.querySelector('#stock-item-modal');
        const itemModalTitle = container.querySelector('#stock-item-modal-title');
        const itemForm = container.querySelector('#stock-item-form');
        const movementModal = container.querySelector('#stock-movement-modal');
        const movementForm = container.querySelector('#stock-movement-form');
        const tableBody = container.querySelector('#stock-table-body');
        const imagePreviewModal = document.getElementById('image-preview-modal');
        const imagePreviewModalClose = document.getElementById('image-preview-modal-close');
        const modalImageContent = document.getElementById('modal-image-content');
        
        const filterName = container.querySelector('#filter-stock-name');
        const filterCode = container.querySelector('#filter-stock-code');
        const filterCategory = container.querySelector('#filter-stock-category');

        const openItemModal = (item = {}) => {
            itemForm.reset();
            itemForm.querySelector('#stock-item-id').value = item.id || '';
            itemForm.querySelector('#stock-item-name').value = item.nome || '';
            itemForm.querySelector('#stock-item-code').value = item.codigo || '';
            itemForm.querySelector('#stock-item-category').value = item.categoria || '';
            itemForm.querySelector('#stock-item-quantity').value = item.quantidade ?? '';
            itemForm.querySelector('#stock-item-unit').value = item.unidade || 'un';
            itemForm.querySelector('#stock-item-image').value = item.imageUrl || '';
            itemForm.querySelector('#stock-item-quantity').disabled = !!item.id;
            itemModalTitle.textContent = item.id ? 'Editar Item' : 'Adicionar Novo Item';
            itemModal.style.display = 'block';
        };

        const openMovementModal = (item) => {
            movementForm.reset();
            movementForm.querySelector('#stock-movement-item-id').value = item.id || '';
            movementModal.querySelector('#stock-movement-modal-title').textContent = `Movimentar: ${item.nome}`;
            movementModal.style.display = 'block';
        };
        
        const closeModal = () => {
            if(itemModal) itemModal.style.display = 'none';
            if(movementModal) movementModal.style.display = 'none';
            if(imagePreviewModal) imagePreviewModal.style.display = 'none';
        }
        
        addTrackedListener(container.querySelector('#btn-add-stock-item'), 'click', () => openItemModal());
        addTrackedListener(container.querySelector('#stock-item-modal-close'), 'click', closeModal);
        addTrackedListener(container.querySelector('#stock-movement-modal-close'), 'click', closeModal);
        addTrackedListener(imagePreviewModalClose, 'click', closeModal);

        addTrackedListener(itemForm, 'submit', (e) => {
            e.preventDefault();
            const id = itemForm.querySelector('#stock-item-id').value;
            const data = {
                nome: itemForm.querySelector('#stock-item-name').value,
                codigo: itemForm.querySelector('#stock-item-code').value,
                categoria: itemForm.querySelector('#stock-item-category').value,
                unidade: itemForm.querySelector('#stock-item-unit').value,
                imageUrl: itemForm.querySelector('#stock-item-image').value,
            };
            
            let promise;
            if (id) {
                promise = stockRef.child(id).update(data);
            } else {
                data.quantidade = parseInt(itemForm.querySelector('#stock-item-quantity').value) || 0;
                promise = stockRef.push(data);
            }
            promise.then(closeModal).catch(err => console.error("Erro ao salvar item:", err));
        });

        addTrackedListener(movementForm, 'submit', (e) => {
            e.preventDefault();
            const id = movementForm.querySelector('#stock-movement-item-id').value;
            const itemAtual = stockItemsData[id];
            if(!itemAtual) return;

            const qtdMovimento = parseInt(movementForm.querySelector('#movement-quantity').value);
            const tipoMovimento = movementForm.querySelector('#movement-type').value;
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
            if(!tableBody) return;
            const nameQuery = filterName.value.toLowerCase();
            const codeQuery = filterCode.value.toLowerCase();
            const categoryQuery = filterCategory.value.toLowerCase();
            tableBody.innerHTML = '';

            Object.entries(stockItemsData).filter(([_, item]) => {
                const nameMatch = (item.nome || '').toLowerCase().includes(nameQuery);
                const codeMatch = (item.codigo || '').toLowerCase().includes(codeQuery);
                const categoryMatch = (item.categoria || '').toLowerCase().includes(categoryQuery);
                return nameMatch && codeMatch && categoryMatch;
            }).sort(([, itemA], [, itemB]) => {
                return (itemA.nome || '').localeCompare(itemB.nome || '');
            }).forEach(([id, item]) => {
                const row = tableBody.insertRow();
                row.className = item.quantidade <= 5 ? 'low-stock' : '';
                row.innerHTML = `
                    <td data-label="Item">${item.nome}</td>
                    <td data-label="Código">${item.codigo || ''}</td>
                    <td data-label="Categoria">${item.categoria || ''}</td>
                    <td data-label="Qtd. Atual">${item.quantidade}</td>
                    <td data-label="Unidade">${item.unidade}</td>
                    <td data-label="Img.">
                        ${item.imageUrl ? `<button class="btn-status btn-view-image" data-url="${item.imageUrl}"><i data-lucide="image"></i></button>` : '<span>-</span>'}
                    </td>
                    <td data-label="Ações">
                        <button class="btn-status btn-edit-stock-item" data-id="${id}" title="Editar"><i data-lucide="edit"></i></button>
                        <button class="btn-status btn-move-stock-item" data-id="${id}" title="Movimentar"><i data-lucide="arrow-right-left"></i></button>
                    </td>
                `;
            });
            lucide.createIcons();
        };

        stockRef.on('value', (snapshot) => {
            const data = snapshot.val() || {};
            stockItemsData = {};
            Object.keys(data).forEach(key => {
                stockItemsData[key] = { ...data[key], id: key };
            });
            renderStockTable();
        });
        
        [filterName, filterCode, filterCategory].forEach(el => addTrackedListener(el, 'input', renderStockTable));

        addTrackedListener(tableBody, 'click', (e) => {
            const editBtn = e.target.closest('.btn-edit-stock-item');
            const moveBtn = e.target.closest('.btn-move-stock-item');
            const viewImageBtn = e.target.closest('.btn-view-image');

            if (editBtn) { openItemModal(stockItemsData[editBtn.dataset.id]); }
            if (moveBtn) { openMovementModal(stockItemsData[moveBtn.dataset.id]); }
            if (viewImageBtn) {
                modalImageContent.src = viewImageBtn.dataset.url;
                imagePreviewModal.style.display = 'block';
            }
        });
        
        return cleanup;
    }
    
    // =====================================================================
    //  3. CONTROLE DE CARROS
    // =====================================================================
    function runCarControlLogic() {
        const { addTrackedListener, trackFirebaseRef, cleanup } = setupEventListeners();
        const container = adminSystemViewContainer;

        const carRef = database.ref('veiculos');
        trackFirebaseRef(carRef);
        let carItemsData = {};
        let employeesData = {}; 

        database.ref('funcionarios').once('value', snapshot => {
            employeesData = snapshot.val() || {};
        });

        const carItemModal = container.querySelector('#car-item-modal');
        const maintenanceModal = container.querySelector('#car-maintenance-modal');
        const carHistoryModal = container.querySelector('#car-history-modal');
        
        const carItemForm = container.querySelector('#car-item-form');
        const maintenanceForm = container.querySelector('#car-maintenance-form');

        const carCardContainer = container.querySelector('#car-card-container');
        const filterCarName = container.querySelector('#filter-car-name');
        const filterCarPlate = container.querySelector('#filter-car-plate');

        const openCarModal = (modal, data = {}) => {
            if (!modal) return;
            const form = modal.querySelector('form');
            if(form) form.reset();
            const modalId = modal.id;
            
            if (modalId === 'car-item-modal') {
                modal.querySelector('#car-item-modal-title').textContent = data.id ? 'Editar Veículo' : 'Adicionar Veículo';
                modal.querySelector('#car-item-id').value = data.id || '';
                modal.querySelector('#car-item-name').value = data.nome || '';
                modal.querySelector('#car-item-plate').value = data.placa || '';
                modal.querySelector('#car-item-km').value = data.kmAtual || '';
                modal.querySelector('#car-item-cc').value = data.cc || '';
                const driverSelect = modal.querySelector('#car-item-driver');
                driverSelect.innerHTML = '<option value="">Selecione um funcionário</option>';
                for (const key in employeesData) {
                    if (employeesData.hasOwnProperty(key)) {
                        driverSelect.innerHTML += `<option value="${employeesData[key].nome}">${employeesData[key].nome}</option>`;
                    }
                }
                driverSelect.value = data.condutor || '';
                modal.querySelector('#car-item-license').value = data.licenciamento || '';
                modal.querySelector('#car-item-renavan').value = data.renavan || '';
            } else if (modalId === 'car-maintenance-modal') {
                 modal.querySelector('#car-maintenance-modal-title').textContent = `Registrar Manutenção: ${data.nome}`;
                 modal.querySelector('#car-maintenance-id').value = data.id || '';
                 modal.querySelector('#car-maintenance-km').value = data.kmAtual || '';
                 modal.querySelector('#car-next-oil-km').value = data.proximaTrocaOleoKM || '';
                 modal.querySelector('#car-next-oil-date').value = data.proximaTrocaOleoData || '';
                 modal.querySelector('#car-next-maintenance-km').value = data.proximaManutencaoKM || '';
                 modal.querySelector('#car-next-maintenance-date').value = data.proximaManutencaoData || '';
                 // Preenche a data da manutenção com a data atual
                 modal.querySelector('#car-maintenance-date').value = new Date().toISOString().split('T')[0];
            }
            modal.style.display = 'block';
        };

        const openCarHistoryModal = (car) => {
            if (!car) return;
            const carHistoryModalTitle = carHistoryModal.querySelector('#car-history-modal-title');
            const carHistoryLog = carHistoryModal.querySelector('#car-history-log');

            carHistoryModalTitle.textContent = `Histórico de: ${car.nome} (${car.placa})`;
            carHistoryLog.innerHTML = '<p>A carregar histórico...</p>';

            const history = car.historicoManutencao || {};
            const historyEntries = Object.values(history).sort((a, b) => new Date(b.data) - new Date(a.data));

            if (historyEntries.length > 0) {
                carHistoryLog.innerHTML = historyEntries.map(entry => `
                    <div class="vencimento-item">
                        <div class="vencimento-item-info">
                            ${entry.tipo}
                            <span>Data: ${new Date(entry.data).toLocaleDateString('pt-BR')} | KM: ${(entry.km || 0).toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                carHistoryLog.innerHTML = '<p>Nenhum registo de manutenção encontrado para este veículo.</p>';
            }
            carHistoryModal.style.display = 'block';
        };

        const closeCarModals = () => {
            if(carItemModal) carItemModal.style.display = 'none';
            if(maintenanceModal) maintenanceModal.style.display = 'none';
            if(carHistoryModal) carHistoryModal.style.display = 'none';
        };

        addTrackedListener(container.querySelector('#btn-add-car'), 'click', () => openCarModal(carItemModal));
        addTrackedListener(container.querySelector('#car-item-modal-close'), 'click', closeCarModals);
        addTrackedListener(container.querySelector('#car-maintenance-modal-close'), 'click', closeCarModals);
        addTrackedListener(container.querySelector('#car-history-modal-close'), 'click', closeCarModals);

        addTrackedListener(carItemForm, 'submit', (e) => {
            e.preventDefault();
            const id = carItemForm.querySelector('#car-item-id').value;
            const data = {
                nome: carItemForm.querySelector('#car-item-name').value,
                placa: carItemForm.querySelector('#car-item-plate').value,
                kmAtual: parseInt(carItemForm.querySelector('#car-item-km').value) || 0,
                cc: carItemForm.querySelector('#car-item-cc').value,
                condutor: carItemForm.querySelector('#car-item-driver').value,
                licenciamento: carItemForm.querySelector('#car-item-license').value,
                renavan: carItemForm.querySelector('#car-item-renavan').value,
            };
            const promise = id ? carRef.child(id).update(data) : carRef.push(data);
            promise.then(closeCarModals).catch(err => console.error("Erro:", err));
        });
        
        addTrackedListener(maintenanceForm, 'submit', (e) => {
            e.preventDefault();
            const id = maintenanceForm.querySelector('#car-maintenance-id').value;
            const item = carItemsData[id];
            if (!item) return;

            const serviceKm = parseInt(maintenanceForm.querySelector('#car-maintenance-km').value);
            const serviceDate = maintenanceForm.querySelector('#car-maintenance-date').value;

            const updates = {
                kmAtual: serviceKm > (item.kmAtual || 0) ? serviceKm : item.kmAtual,
                proximaTrocaOleoKM: parseInt(maintenanceForm.querySelector('#car-next-oil-km').value) || null,
                proximaTrocaOleoData: maintenanceForm.querySelector('#car-next-oil-date').value || null,
                proximaManutencaoKM: parseInt(maintenanceForm.querySelector('#car-next-maintenance-km').value) || null,
                proximaManutencaoData: maintenanceForm.querySelector('#car-next-maintenance-date').value || null
            };
            
            const historicoRef = database.ref(`veiculos/${id}/historicoManutencao`);
            const newEntry = {
                data: serviceDate,
                km: serviceKm,
                tipo: maintenanceForm.querySelector('#car-maintenance-type').value,
            };
            
            historicoRef.push(newEntry);
            carRef.child(id).update(updates).then(closeCarModals);
        });

        const renderCarCards = () => {
            if (!carCardContainer) return;
            const nameQuery = filterCarName.value.toLowerCase();
            const plateQuery = filterCarPlate.value.toLowerCase();
            carCardContainer.innerHTML = '';
            
            Object.entries(carItemsData).filter(([_, car]) => {
                return (car.nome || '').toLowerCase().includes(nameQuery) && (car.placa || '').toLowerCase().includes(plateQuery);
            }).sort(([, carA], [, carB]) => {
                return (carA.nome || '').localeCompare(carB.nome || '');
            }).forEach(([id, car]) => {
                const indicators = [];
                const kmAlertThreshold = 1000;
                const dateAlertThreshold = 30 * 24 * 60 * 60 * 1000;

                if (car.proximaTrocaOleoKM && car.kmAtual) {
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
                    if (licenseDate < today) {
                         indicators.push('<div class="indicator-bar indicator-license-danger" title="Licenciamento vencido"></div>');
                    } else if (licenseDate - today < dateAlertThreshold) {
                         indicators.push('<div class="indicator-bar indicator-license-warning" title="Licenciamento próximo"></div>');
                    }
                }
                
                const formatKm = (km) => km ? km.toLocaleString('pt-BR') : '-';
                const formatDate = (dateString) => dateString ? new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
                
                const card = document.createElement('div');
                card.className = 'car-card';
                card.innerHTML = `
                    <div class="status-indicators">${indicators.join('')}</div>
                    <div class="car-card-content">
                        <div class="car-card-header"><h3>${car.nome || 'N/A'}</h3><p>${car.placa || 'N/A'}</p></div>
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
                            <button class="btn-status btn-add-maintenance" data-id="${id}" title="Registrar Manutenção"><i data-lucide="wrench"></i></button>
                            <button class="btn-status btn-view-history" data-id="${id}" title="Ver Histórico"><i data-lucide="history"></i></button>
                        </div>
                    </div>`;
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

        addTrackedListener(filterCarName, 'input', renderCarCards);
        addTrackedListener(filterCarPlate, 'input', renderCarCards);

        addTrackedListener(carCardContainer, 'click', (e) => {
            const button = e.target.closest('.btn-status');
            if(!button) return;
            const id = button.dataset.id;
            const carData = carItemsData[id];

            if (button.classList.contains('btn-edit-car')) openCarModal(carItemModal, carData);
            if (button.classList.contains('btn-add-maintenance')) openCarModal(maintenanceModal, carData);
            if (button.classList.contains('btn-view-history')) openCarHistoryModal(carData);
        });
        
        return cleanup;
    }
    
    // =====================================================================
    //  4. CONTROLE DE FERRAMENTAS
    // =====================================================================
    function runToolControlLogic() {
        const { addTrackedListener, trackFirebaseRef, cleanup } = setupEventListeners();
        const container = adminSystemViewContainer;
        
        const toolRef = database.ref('ferramentas');
        trackFirebaseRef(toolRef);
        let toolsData = {};
        let employeesData = {};
        let projectsData = {};

        database.ref('funcionarios').once('value', snapshot => { employeesData = snapshot.val() || {}; });
        database.ref('clientes').once('value', snapshot => { projectsData = snapshot.val() || {}; });

        const toolItemModal = container.querySelector('#tool-item-modal');
        const toolAssignModal = container.querySelector('#tool-assign-modal');
        const toolMaintenanceModal = container.querySelector('#tool-maintenance-modal');
        const toolHistoryModal = container.querySelector('#tool-history-modal');

        const toolItemForm = container.querySelector('#tool-item-form');
        const toolAssignForm = container.querySelector('#tool-assign-form');
        const toolMaintenanceForm = container.querySelector('#tool-maintenance-form');
        const toolTableBody = container.querySelector('#tool-table-body');
        const filterToolName = container.querySelector('#filter-tool-name');
        const filterToolCode = container.querySelector('#filter-tool-code');
        const filterToolStatus = container.querySelector('#filter-tool-status');
        const btnViewToolHistory = container.querySelector('#btn-view-tool-history');
        const toolHistoryModalClose = container.querySelector('#tool-history-modal-close');
        const selectToolHistory = container.querySelector('#select-tool-history');
        const toolHistoryLog = container.querySelector('#tool-history-log');

        const addToolHistory = (toolId, action) => {
            database.ref(`ferramentas/${toolId}/historico`).push({ date: new Date().toISOString(), action: action });
        };
        
        const openModal = (modal, data = {}) => {
            if (!modal) return;
            const form = modal.querySelector('form');
            if (form) form.reset();
            const modalId = modal.id;

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
            if(toolItemModal) toolItemModal.style.display = 'none';
            if(toolAssignModal) toolAssignModal.style.display = 'none';
            if(toolMaintenanceModal) toolMaintenanceModal.style.display = 'none';
            if(toolHistoryModal) toolHistoryModal.style.display = 'none';
        };

        addTrackedListener(container.querySelector('#btn-add-tool'), 'click', () => openModal(toolItemModal));
        addTrackedListener(container.querySelector('#tool-item-modal-close'), 'click', closeToolModals);
        addTrackedListener(container.querySelector('#tool-assign-modal-close'), 'click', closeToolModals);
        addTrackedListener(container.querySelector('#tool-maintenance-modal-close'), 'click', closeToolModals);
        addTrackedListener(toolHistoryModalClose, 'click', closeToolModals);
        
        addTrackedListener(toolItemForm, 'submit', e => {
            e.preventDefault();
            const id = toolItemForm.querySelector('#tool-item-id').value;
            const data = { nome: toolItemForm.querySelector('#tool-item-name').value, marca: toolItemForm.querySelector('#tool-item-brand').value, modelo: toolItemForm.querySelector('#tool-item-model').value, codigo: toolItemForm.querySelector('#tool-item-code').value, dataCompra: toolItemForm.querySelector('#tool-item-buy-date').value, valor: parseFloat(toolItemForm.querySelector('#tool-item-value').value) || 0 };
            let promise;
            if (id) {
                promise = toolRef.child(id).update(data);
                addToolHistory(id, `Dados da ferramenta atualizados.`);
            } else {
                data.status = 'Disponível';
                promise = toolRef.push(data).then(newRef => addToolHistory(newRef.key, `Ferramenta criada com status 'Disponível'.`));
            }
            promise.then(closeToolModals).catch(err => console.error(err));
        });
        
        addTrackedListener(toolAssignForm, 'submit', e => {
            e.preventDefault();
            const id = toolAssignForm.querySelector('#tool-assign-id').value;
            const employee = toolAssignForm.querySelector('#tool-assign-employee').value;
            const project = toolAssignForm.querySelector('#tool-assign-project').value;
            const updates = { status: 'Em Uso', responsavel: employee, local: project, dataRetirada: toolAssignForm.querySelector('#tool-assign-date').value };
            toolRef.child(id).update(updates).then(() => {
                addToolHistory(id, `Alocada para ${employee} na obra ${project}.`);
                closeToolModals();
            });
        });
        
        addTrackedListener(toolMaintenanceForm, 'submit', e => {
            e.preventDefault();
            const id = toolMaintenanceForm.querySelector('#tool-maintenance-id').value;
            const oldTool = toolsData[id];
            const status = toolMaintenanceForm.querySelector('#tool-maintenance-status').value;
            const updates = { status: status, proximaManutencao: toolMaintenanceForm.querySelector('#tool-maintenance-next-date').value, responsavel: status === 'Disponível' ? null : oldTool.responsavel, local: status === 'Disponível' ? null : oldTool.local };
            toolRef.child(id).update(updates).then(() => {
                addToolHistory(id, `Status alterado de '${oldTool.status}' para '${status}'.`);
                closeToolModals();
            });
        });

        const renderToolTable = () => {
            if (!toolTableBody) return;
            const nameQuery = filterToolName.value.toLowerCase();
            const codeQuery = filterToolCode.value.toLowerCase();
            const statusQuery = filterToolStatus.value;
            toolTableBody.innerHTML = '';
            
            Object.entries(toolsData).filter(([_, tool]) => {
                return (tool.nome || '').toLowerCase().includes(nameQuery) && (tool.codigo || '').toLowerCase().includes(codeQuery) && (statusQuery === 'all' || tool.status === statusQuery);
            }).sort(([, toolA], [, toolB]) => {
                return (toolA.nome || '').localeCompare(toolB.nome || '');
            }).forEach(([id, tool]) => {
                const row = toolTableBody.insertRow();
                let statusColorClass = '';
                 switch (tool.status) {
                    case 'Disponível': statusColorClass = 'status-dot-green'; break;
                    case 'Em Uso': statusColorClass = 'status-dot-yellow'; break;
                    case 'Em Manutenção': statusColorClass = 'status-dot-red'; break;
                    case 'Descartada': statusColorClass = 'status-dot-red'; break;
                }

                row.className = '';
                if(tool.status === 'Em Manutenção') row.className = 'maintenance-due';
                if(tool.status === 'Descartada') row.className = 'discarded-row';

                let location = 'Depósito';
                if (tool.status === 'Em Uso') {
                    location = `${tool.responsavel} @ ${tool.local}`;
                } else if (tool.status === 'Em Manutenção') {
                    location = 'Manutenção';
                } else if (tool.status === 'Descartada') {
                    location = 'Descartada';
                }
                
                const isDiscarded = tool.status === 'Descartada';

                row.innerHTML = `
                    <td data-label="Ferramenta">${tool.nome || 'N/A'}</td>
                    <td data-label="Código">${tool.codigo || 'N/A'}</td>
                    <td data-label="Status"><div><span class="status-dot ${statusColorClass}"></span><span class="status-text">${tool.status || 'N/A'}</span></div></td>
                    <td data-label="Local/Responsável">${location}</td>
                    <td data-label="Ações">
                        <button class="btn-status btn-edit-tool" data-id="${id}" title="Editar" ${isDiscarded ? 'disabled' : ''}><i data-lucide="edit"></i></button>
                        <button class="btn-status btn-assign-tool" data-id="${id}" title="Alocar" ${tool.status !== 'Disponível' ? 'disabled' : ''}><i data-lucide="arrow-right-left"></i></button>
                        <button class="btn-status btn-return-tool" data-id="${id}" title="Devolver" ${tool.status !== 'Em Uso' ? 'disabled' : ''}><i data-lucide="undo-2"></i></button>
                        <button class="btn-status btn-maintenance-tool" data-id="${id}" title="Manutenção" ${isDiscarded ? 'disabled' : ''}><i data-lucide="wrench"></i></button>
                        <button class="btn-status btn-discard-tool" data-id="${id}" title="Descartar" ${isDiscarded ? 'disabled' : ''} style="${isDiscarded ? '' : 'color: var(--danger-color);'}"><i data-lucide="trash-2"></i></button>
                    </td>`;
            });
            lucide.createIcons();
        };
        
        addTrackedListener(btnViewToolHistory, 'click', () => {
            selectToolHistory.innerHTML = '<option value="">Selecione uma ferramenta...</option>';
            Object.entries(toolsData).sort(([, toolA], [, toolB]) => (toolA.nome || '').localeCompare(toolB.nome || '')).forEach(([id, tool]) => {
                selectToolHistory.innerHTML += `<option value="${id}">${tool.nome} (${tool.codigo || 'S/C'})</option>`;
            });
            toolHistoryLog.innerHTML = '<p>Selecione uma ferramenta para ver seu histórico.</p>';
            toolHistoryModal.style.display = 'block';
        });

        addTrackedListener(selectToolHistory, 'change', () => {
            const selectedToolId = selectToolHistory.value;
            if (selectedToolId && toolsData[selectedToolId]?.historico) {
                const historyEntries = Object.values(toolsData[selectedToolId].historico).sort((a, b) => new Date(b.date) - new Date(a.date));
                toolHistoryLog.innerHTML = historyEntries.map(entry => `<div class="history-item">${entry.action}<span>${new Date(entry.date).toLocaleString('pt-BR')}</span></div>`).join('');
            } else {
                toolHistoryLog.innerHTML = '<p>Nenhum histórico encontrado para esta ferramenta.</p>';
            }
        });
        
        toolRef.on('value', snapshot => {
            toolsData = {};
            const data = snapshot.val() || {};
            Object.keys(data).forEach(key => toolsData[key] = { ...data[key], id: key });
            renderToolTable();
        });

        [filterToolName, filterToolCode, filterToolStatus].forEach(el => addTrackedListener(el, 'input', renderToolTable));

        addTrackedListener(toolTableBody, 'click', (e) => {
            const button = e.target.closest('.btn-status');
            if (!button) return;
            const id = button.dataset.id;
            const tool = toolsData[id];
            if (button.classList.contains('btn-edit-tool')) {
                openModal(toolItemModal, tool);
            } else if (button.classList.contains('btn-assign-tool')) {
                openModal(toolAssignModal, tool);
            } else if (button.classList.contains('btn-maintenance-tool')) {
                openModal(toolMaintenanceModal, tool);
            } else if (button.classList.contains('btn-return-tool')) {
                const updates = { status: 'Disponível', responsavel: null, local: null, dataRetirada: null };
                toolRef.child(id).update(updates).then(() => addToolHistory(id, `Devolvida. Responsável anterior: ${tool.responsavel || 'N/A'}.`));
            } else if (button.classList.contains('btn-discard-tool')) {
                const updates = { status: 'Descartada', responsavel: null, local: null, dataRetirada: null };
                toolRef.child(id).update(updates).then(() => {
                    addToolHistory(id, `Ferramenta marcada como 'Descartada'.`);
                });
            }
        });
        
        return cleanup;
    }
});
