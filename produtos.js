// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyD8sNfGilLum2rnN7Qt1fBRP4ONhzemWNE",
    authDomain: "guilherme-2a3f3.firebaseapp.com",
    databaseURL: "https://guilherme-2a3f3-default-rtdb.firebaseio.com",
    projectId: "guilherme-2a3f3",
    storageBucket: "guilherme-2a3f3.appspot.com",
    messagingSenderId: "60682599861",
    appId: "1:60682599861:web:c74a9aaa7651d14cbd2dfc",
    measurementId: "G-MZSHRPP56K"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

document.addEventListener('DOMContentLoaded', () => {
    // --- ROTEAMENTO E LÓGICA PRINCIPAL ---
    const urlParams = new URLSearchParams(window.location.search);
    const clientId = urlParams.get('client');
    const isViewMode = urlParams.get('view') === 'true';

    if (clientId) {
        // Estamos na página de um cliente específico
        setupClientPage(clientId, isViewMode);
    } else {
        // Estamos na página principal (gerenciador de clientes)
        setupClientManager();
    }
});

// =================================================================
// PÁGINA PRINCIPAL: GERENCIADOR DE CLIENTES
// =================================================================
function setupClientManager() {
    // --- SELETORES ---
    const clientManagerView = document.getElementById('client-manager-view');
    const clientPageView = document.getElementById('client-page-view');
    const addClientForm = document.getElementById('add-client-form');
    const clientNameInput = document.getElementById('client-name-input');
    const clientListDiv = document.getElementById('client-list');

    // --- EXIBIÇÃO ---
    clientManagerView.style.display = 'block';
    clientPageView.style.display = 'none';

    // --- RENDERIZAR LISTA DE CLIENTES ---
    const renderClientList = (clients) => {
        clientListDiv.innerHTML = '';
        if (!clients) {
            clientListDiv.innerHTML = '<p>Nenhum cliente criado ainda. Adicione um acima.</p>';
            return;
        }

        Object.entries(clients).forEach(([id, client]) => {
            const clientItem = document.createElement('div');
            clientItem.className = 'client-item';
            const viewerUrl = `${window.location.origin}${window.location.pathname}?client=${id}&view=true`;

            clientItem.innerHTML = `
                <h3>${client.name}</h3>
                <div class="client-actions">
                    <a href="?client=${id}" class="view-button">Editar Produtos</a>
                    <button class="copy-btn" data-url="${viewerUrl}">Copiar Link do Cliente</button>
                    <button class="delete-client-btn" data-id="${id}" data-name="${client.name}">&times;</button>
                </div>
            `;
            clientListDiv.appendChild(clientItem);
        });
    };

    // --- EVENT LISTENERS ---
    addClientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const clientName = clientNameInput.value.trim();
        if (clientName) {
            database.ref('clients').push({ name: clientName });
            clientNameInput.value = '';
        }
    });

    clientListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-client-btn')) {
            const clientId = e.target.dataset.id;
            const clientName = e.target.dataset.name;
            if (confirm(`Tem certeza que deseja excluir o cliente "${clientName}" e todos os seus dados?`)) {
                database.ref(`clients/${clientId}`).remove();
            }
        }
        if (e.target.classList.contains('copy-btn')) {
            const url = e.target.dataset.url;
            navigator.clipboard.writeText(url).then(() => {
                e.target.textContent = 'Copiado!';
                setTimeout(() => { e.target.textContent = 'Copiar Link do Cliente'; }, 2000);
            });
        }
    });

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    database.ref('clients').on('value', (snapshot) => {
        renderClientList(snapshot.val());
    });
}


// =================================================================
// PÁGINA ESPECÍFICA DO CLIENTE: EDITOR/VISUALIZADOR
// =================================================================
function setupClientPage(clientId, isViewMode) {
    // --- SELETORES ---
    const clientManagerView = document.getElementById('client-manager-view');
    const clientPageView = document.getElementById('client-page-view');
    const editorView = document.getElementById('editor-view');
    const viewerView = document.getElementById('viewer-view');
    const editorHeaderTitle = document.getElementById('editor-header-title');
    const viewerHeaderTitle = document.getElementById('viewer-header-title');
    const goToViewerBtn = document.getElementById('go-to-viewer-btn');
    
    const categoriesContainer = document.getElementById('categories-container');
    const viewerContainer = document.getElementById('viewer-container');
    const addCategoryForm = document.getElementById('add-category-form');
    const categoryNameInput = document.getElementById('category-name-input');
    const showCardModalBtn = document.getElementById('show-card-modal-btn');
    
    // Modal elements
    const addCardModal = document.getElementById('add-card-modal');
    const addCardForm = document.getElementById('add-card-form');
    const cancelCardBtn = document.getElementById('cancel-card-btn');
    const cardCategorySelect = document.getElementById('card-category');
    const modalTitle = document.getElementById('modal-title');
    const saveCardBtn = document.getElementById('save-card-btn');
    const cardIdEditInput = document.getElementById('card-id-edit');
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const modalImage = document.getElementById('modal-image');
    const closeImageModalBtn = document.querySelector('.close-image-modal');

    // --- CAMINHOS DO FIREBASE ---
    const clientRef = database.ref(`clients/${clientId}`);
    const dataRef = database.ref(`clients/${clientId}/productData`);
    
    // --- ESTADO LOCAL ---
    let localData = [];

    // --- EXIBIÇÃO ---
    clientManagerView.style.display = 'none';
    clientPageView.style.display = 'block';
    
    if (isViewMode) {
        editorView.style.display = 'none';
        viewerView.style.display = 'block';
    } else {
        editorView.style.display = 'block';
        viewerView.style.display = 'none';
    }

    // --- ATUALIZAR TÍTULOS E LINKS ---
    clientRef.child('name').once('value', (snapshot) => {
        const clientName = snapshot.val() || 'Cliente';
        editorHeaderTitle.textContent = `Editor de Produtos: ${clientName}`;
        viewerHeaderTitle.textContent = `Aprovação de Produtos: ${clientName}`;
        goToViewerBtn.href = `?client=${clientId}&view=true`;
    });

    // --- LÓGICA DE RENDERIZAÇÃO DE PRODUTOS (Adaptada) ---
    const render = (data) => {
        localData = data;
        categoriesContainer.innerHTML = '';
        viewerContainer.innerHTML = '';

        if (data.length === 0) {
            const noDataMsg = '<p>Nenhum ambiente criado ainda. Adicione um no modo de edição.</p>';
            categoriesContainer.innerHTML = noDataMsg;
            viewerContainer.innerHTML = noDataMsg;
        }

        data.forEach(category => {
            const categorySectionEditor = document.createElement('section');
            categorySectionEditor.className = 'category-section';
            categorySectionEditor.innerHTML = `<h2>${category.name} <button class="delete-category-btn" data-category-id="${category.id}" title="Excluir Ambiente">&times;</button></h2><div class="cards-grid"></div>`;
            categoriesContainer.appendChild(categorySectionEditor);

            const categorySectionViewer = document.createElement('section');
            categorySectionViewer.className = 'category-section';
            categorySectionViewer.innerHTML = `<h2>${category.name}</h2><div class="cards-grid"></div>`;
            viewerContainer.appendChild(categorySectionViewer);

            const cardsGridEditor = categorySectionEditor.querySelector('.cards-grid');
            const cardsGridViewer = categorySectionViewer.querySelector('.cards-grid');

            if (category.cards && category.cards.length > 0) {
                category.cards.forEach(card => {
                    cardsGridEditor.appendChild(createCardElement(card, category.id, false));
                    cardsGridViewer.appendChild(createCardElement(card, category.id, true));
                });
            }
        });
        updateCategoryDropdown(data);
    };

    const createCardElement = (card, categoryId, isViewer) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.id = card.id;
        cardDiv.dataset.categoryId = categoryId;

        if (card.status === 'approved') cardDiv.classList.add('approved');
        if (card.status === 'rejected') cardDiv.classList.add('rejected');

        cardDiv.innerHTML = `
            <img src="${card.image}" alt="${card.name}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/f2eee9/5a7d7c?text=Imagem';">
            <div class="card-content">
                <h3>${card.name || '...'}</h3>
                <p class="description">${card.description}</p>
                <p>Quantidade: ${card.quantity}</p>
            </div>
        `;

        if (isViewer) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions-viewer';
            actionsDiv.innerHTML = `<button class="approve-btn">Aprovado</button><button class="reject-btn">Reprovado</button>`;
            cardDiv.appendChild(actionsDiv);
        } else {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions-editor';
            actionsDiv.innerHTML = `<button class="edit-btn" title="Editar">&#9998;</button><button class="delete-btn" title="Excluir">&times;</button>`;
            cardDiv.appendChild(actionsDiv);
        }
        return cardDiv;
    };

    const updateCategoryDropdown = (data) => {
        const hasCategories = data && data.length > 0;
        showCardModalBtn.style.display = hasCategories ? 'inline-block' : 'none';
        cardCategorySelect.innerHTML = '';
        if (!hasCategories) {
            cardCategorySelect.innerHTML = '<option disabled>Crie um ambiente primeiro</option>';
        } else {
            data.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                cardCategorySelect.appendChild(option);
            });
        }
    };

    // --- LÓGICA DE MODAIS (sem alteração) ---
    const openFormModal = (cardToEdit = null, categoryId = null) => {
        addCardForm.reset();
        if (cardToEdit && categoryId) {
            modalTitle.textContent = 'Editar Produto';
            saveCardBtn.textContent = 'Salvar Alterações';
            cardIdEditInput.value = cardToEdit.id;
            document.getElementById('card-category').value = categoryId;
            document.getElementById('card-image').value = cardToEdit.image;
            document.getElementById('card-name').value = cardToEdit.name || '';
            document.getElementById('card-description').value = cardToEdit.description;
            document.getElementById('card-quantity').value = cardToEdit.quantity;
        } else {
            modalTitle.textContent = 'Adicionar Novo Produto';
            saveCardBtn.textContent = 'Salvar Produto';
            cardIdEditInput.value = '';
        }
        addCardModal.style.display = 'flex';
    };
    const closeFormModal = () => addCardModal.style.display = 'none';
    const openImageModal = (src) => { imageViewerModal.style.display = 'flex'; modalImage.src = src; };
    const closeImageModal = () => imageViewerModal.style.display = 'none';

    // --- EVENT LISTENERS (Adaptados para o caminho do cliente) ---
    addCategoryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const categoryName = categoryNameInput.value.trim();
        if (categoryName) {
            dataRef.push({ name: categoryName, cards: {} }); // Adiciona um objeto de cards vazio
            categoryNameInput.value = '';
        }
    });

    addCardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const categoryId = document.getElementById('card-category').value;
        const cardId = cardIdEditInput.value || `card-${Date.now()}`;
        const cardData = {
            id: cardId,
            image: document.getElementById('card-image').value,
            name: document.getElementById('card-name').value,
            description: document.getElementById('card-description').value,
            quantity: document.getElementById('card-quantity').value,
            status: 'pending'
        };
        dataRef.child(`${categoryId}/cards/${cardId}`).set(cardData);
        closeFormModal();
    });

    categoriesContainer.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('delete-category-btn')) {
            const categoryId = target.dataset.categoryId;
            if (confirm('Tem certeza que deseja excluir este ambiente e TODOS os seus produtos?')) {
                dataRef.child(categoryId).remove();
            }
            return;
        }
        
        const cardElement = target.closest('.card');
        if (!cardElement) return;
        const cardId = cardElement.dataset.id;
        const categoryId = cardElement.dataset.categoryId;
        const category = localData.find(c => c.id === categoryId);
        const card = category?.cards?.find(c => c.id === cardId);

        if (target.classList.contains('edit-btn') && card) {
            openFormModal(card, categoryId);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                dataRef.child(`${categoryId}/cards/${cardId}`).remove();
            }
        }
    });
    
    viewerView.addEventListener('click', (e) => {
        const target = e.target;
        const cardElement = target.closest('.card');
        if (!cardElement) return;
        
        if (target.tagName === 'IMG') {
            openImageModal(target.src);
            return;
        }

        const isApprove = target.classList.contains('approve-btn');
        const isReject = target.classList.contains('reject-btn');

        if (isApprove || isReject) {
            const cardId = cardElement.dataset.id;
            const categoryId = cardElement.dataset.categoryId;
            if (cardId && categoryId) {
                const newStatus = isApprove ? 'approved' : 'rejected';
                dataRef.child(`${categoryId}/cards/${cardId}/status`).set(newStatus);
            }
        }
    });

    // Demais eventos
    showCardModalBtn.addEventListener('click', () => openFormModal());
    cancelCardBtn.addEventListener('click', closeFormModal);
    closeImageModalBtn.addEventListener('click', closeImageModal);
    imageViewerModal.addEventListener('click', (e) => {
        if (e.target === imageViewerModal) closeImageModal();
    });

    // Event listener para o botão Voltar
    const voltarAdminBtn = document.getElementById('voltar-admin-btn');
    if (voltarAdminBtn) {
        voltarAdminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Volta para a página anterior (Gerenciador de Clientes)
            window.history.back();
        });
    }

    // --- SINCRONIZAÇÃO COM FIREBASE (Adaptada) ---
    dataRef.on('value', (snapshot) => {
        const firebaseData = snapshot.val();
        const dataForRender = [];
        if (firebaseData) {
            for (const categoryId in firebaseData) {
                const category = firebaseData[categoryId];
                const cardsArray = [];
                if (category.cards) {
                    for (const cardId in category.cards) {
                        cardsArray.push(category.cards[cardId]);
                    }
                }
                dataForRender.push({
                    id: categoryId,
                    name: category.name,
                    cards: cardsArray
                });
            }
        }
        render(dataForRender);
    });
}
