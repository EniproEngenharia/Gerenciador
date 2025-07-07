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
    const reportId = urlParams.get('report'); // Alterado de 'client' para 'report'
    const isViewMode = urlParams.get('view') === 'true';

    if (reportId) {
        // Estamos na página de um relatório específico
        setupReportPage(reportId, isViewMode);
    } else {
        // Estamos na página principal (gerenciador de relatórios)
        setupReportManager();
    }
});

// =================================================================
// PÁGINA PRINCIPAL: GERENCIADOR DE RELATÓRIOS
// =================================================================
function setupReportManager() {
    // --- SELETORES ---
    const reportManagerView = document.getElementById('report-manager-view');
    const reportPageView = document.getElementById('report-page-view');
    const addReportForm = document.getElementById('add-report-form');
    const reportNameInput = document.getElementById('report-name-input');
    const reportListDiv = document.getElementById('report-list');

    // --- EXIBIÇÃO ---
    reportManagerView.style.display = 'block';
    reportPageView.style.display = 'none';

    // --- RENDERIZAR LISTA DE RELATÓRIOS ---
    const renderReportList = (reports) => {
        reportListDiv.innerHTML = '';
        if (!reports) {
            reportListDiv.innerHTML = '<p>Nenhum relatório criado ainda. Adicione um acima.</p>';
            return;
        }

        Object.entries(reports).forEach(([id, report]) => {
            const reportItem = document.createElement('div');
            reportItem.className = 'report-item';
            const viewerUrl = `${window.location.origin}${window.location.pathname}?report=${id}&view=true`;

            reportItem.innerHTML = `
                <h3>${report.name}</h3>
                <div class="report-actions">
                    <a href="?report=${id}" class="view-button">Editar Relatório</a>
                    <button class="copy-btn" data-url="${viewerUrl}">Copiar Link do Relatório</button>
                    <button class="delete-report-btn" data-id="${id}" data-name="${report.name}">×</button>
                </div>
            `;
            reportListDiv.appendChild(reportItem);
        });
    };

    // --- EVENT LISTENERS ---
    addReportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const reportName = reportNameInput.value.trim();
        if (reportName) {
            database.ref('reports').push({ name: reportName }); // Alterado de 'clients' para 'reports'
            reportNameInput.value = '';
        }
    });

    reportListDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-report-btn')) {
            const reportId = e.target.dataset.id;
            const reportName = e.target.dataset.name;
            if (confirm(`Tem certeza que deseja excluir o relatório "${reportName}" e todos os seus dados?`)) {
                database.ref(`reports/${reportId}`).remove();
            }
        }
        if (e.target.classList.contains('copy-btn')) {
            const url = e.target.dataset.url;
            navigator.clipboard.writeText(url).then(() => {
                e.target.textContent = 'Copiado!';
                setTimeout(() => { e.target.textContent = 'Copiar Link do Relatório'; }, 2000);
            });
        }
    });

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    database.ref('reports').on('value', (snapshot) => { // Alterado de 'clients' para 'reports'
        renderReportList(snapshot.val());
    });
}


// =================================================================
// PÁGINA ESPECÍFICA DO RELATÓRIO: EDITOR/VISUALIZADOR
// =================================================================
function setupReportPage(reportId, isViewMode) {
    // --- SELETORES ---
    const reportManagerView = document.getElementById('report-manager-view');
    const reportPageView = document.getElementById('report-page-view');
    const editorView = document.getElementById('editor-view');
    const viewerView = document.getElementById('viewer-view');
    const editorHeaderTitle = document.getElementById('editor-header-title');
    const viewerHeaderTitle = document.getElementById('viewer-header-title');
    const goToViewerBtn = document.getElementById('go-to-viewer-btn');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    
    const stepsContainer = document.getElementById('steps-container');
    const viewerContainer = document.getElementById('viewer-container');
    const addStepForm = document.getElementById('add-step-form');
    const stepNameInput = document.getElementById('step-name-input');
    const showPhotoModalBtn = document.getElementById('show-photo-modal-btn');
    
    // Modal elements
    const addPhotoModal = document.getElementById('add-photo-modal');
    const addPhotoForm = document.getElementById('add-photo-form');
    const cancelPhotoBtn = document.getElementById('cancel-photo-btn');
    const photoStepSelect = document.getElementById('photo-step');
    const modalTitle = document.getElementById('modal-title');
    const savePhotoBtn = document.getElementById('save-photo-btn');
    const photoIdEditInput = document.getElementById('photo-id-edit');
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const modalImage = document.getElementById('modal-image');
    const closeImageModalBtn = document.querySelector('.close-image-modal');

    // --- CAMINHOS DO FIREBASE ---
    const reportRef = database.ref(`reports/${reportId}`);
    const dataRef = database.ref(`reports/${reportId}/reportData`);
    
    // --- ESTADO LOCAL ---
    let localData = [];
    let reportName = 'Relatório';

    // --- EXIBIÇÃO ---
    reportManagerView.style.display = 'none';
    reportPageView.style.display = 'block';
    
    if (isViewMode) {
        editorView.style.display = 'none';
        viewerView.style.display = 'block';
    } else {
        editorView.style.display = 'block';
        viewerView.style.display = 'none';
    }

    // --- ATUALIZAR TÍTULOS E LINKS ---
    reportRef.child('name').once('value', (snapshot) => {
        reportName = snapshot.val() || 'Relatório';
        editorHeaderTitle.textContent = `Editor de Relatório: ${reportName}`;
        viewerHeaderTitle.textContent = `Relatório Fotográfico: ${reportName}`;
        goToViewerBtn.href = `?report=${reportId}&view=true`;
    });

    // --- LÓGICA DE GERAÇÃO DE PDF ---
    const generatePdf = async () => {
        const elementToPrint = document.getElementById('viewer-view');
        const editorViewElement = document.getElementById('editor-view');
        const originalButtonText = downloadPdfBtn.textContent;
    
        downloadPdfBtn.textContent = 'A preparar o PDF...';
        downloadPdfBtn.disabled = true;
    
        const originalEditorDisplay = editorViewElement.style.display;
        const originalViewerDisplay = elementToPrint.style.display;

        editorViewElement.style.display = 'none';
        elementToPrint.style.display = 'block';
    
        const images = Array.from(elementToPrint.getElementsByTagName('img'));
        const originalSrcs = new Map();
    
        const convertImageToDataURL = async (img) => {
            const originalSrc = img.src;
            originalSrcs.set(img, originalSrc); 
    
            if (originalSrc.startsWith('data:') || !originalSrc) {
                return;
            }
    
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(originalSrc)}`;
    
            try {
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`A resposta da rede não foi OK para: ${originalSrc}`);
                const blob = await response.blob();
                
                const dataUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                img.src = dataUrl;
    
            } catch (error) {
                console.warn(`Não foi possível carregar a imagem via proxy: ${originalSrc}`, error);
                img.src = `https://placehold.co/600x400/f2eee9/5a7d7c?text=Imagem+Indisponível`;
            }
        };
    
        await Promise.all(images.map(convertImageToDataURL));
    
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
    
            const canvas = await html2canvas(elementToPrint, {
                scale: 2,
                useCORS: true,
                allowTaint: false,
                windowHeight: elementToPrint.scrollHeight // Garante que a altura total seja capturada
            });
    
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            
            // Lógica para dividir o conteúdo em várias páginas A4
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            const ratio = canvasWidth / pdfWidth;
            const totalContentHeight = canvasHeight / ratio;
            
            let heightLeft = totalContentHeight;
            let position = 0;

            // Adiciona a primeira página
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalContentHeight);
            heightLeft -= pdfHeight;

            // Adiciona páginas subsequentes se o conteúdo for maior que uma página
            while (heightLeft > 0) {
                position -= pdfHeight; // Move a "janela" da imagem para cima
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, totalContentHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`relatorio-${reportName.replace(/ /g, '_')}.pdf`);
    
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Ocorreu um erro ao gerar o PDF. Algumas imagens podem não ter sido carregadas corretamente.");
        } finally {
            images.forEach(img => {
                if (originalSrcs.has(img)) {
                    img.src = originalSrcs.get(img);
                }
            });
    
            editorViewElement.style.display = originalEditorDisplay;
            elementToPrint.style.display = originalViewerDisplay;
            
            downloadPdfBtn.textContent = originalButtonText;
            downloadPdfBtn.disabled = false;
        }
    };

    // --- LÓGICA DE RENDERIZAÇÃO ---
    const render = (data) => {
        localData = data;
        stepsContainer.innerHTML = '';
        viewerContainer.innerHTML = '';

        if (data.length === 0) {
            const noDataMsg = '<p>Nenhuma etapa criada ainda. Adicione uma no modo de edição.</p>';
            stepsContainer.innerHTML = noDataMsg;
            viewerContainer.innerHTML = noDataMsg;
        }

        data.forEach(step => {
            const stepSectionEditor = document.createElement('section');
            stepSectionEditor.className = 'step-section';
            // Adicionado botão de editar etapa
            stepSectionEditor.innerHTML = `<h2>${step.name} <div><button class="edit-step-btn" data-step-id="${step.id}" title="Editar Etapa">✎</button><button class="delete-step-btn" data-step-id="${step.id}" title="Excluir Etapa">×</button></div></h2><div class="photos-grid"></div>`;
            stepsContainer.appendChild(stepSectionEditor);

            const stepSectionViewer = document.createElement('section');
            stepSectionViewer.className = 'step-section';
            stepSectionViewer.innerHTML = `<h2>${step.name}</h2><div class="photos-grid"></div>`;
            viewerContainer.appendChild(stepSectionViewer);

            const photosGridEditor = stepSectionEditor.querySelector('.photos-grid');
            const photosGridViewer = stepSectionViewer.querySelector('.photos-grid');

            if (step.photos && step.photos.length > 0) {
                step.photos.forEach(photo => {
                    photosGridEditor.appendChild(createPhotoCardElement(photo, step.id, false)); // Passa false para o editor
                    photosGridViewer.appendChild(createPhotoCardElement(photo, step.id, true)); // Passa true para o visualizador
                });
            }
        });
        updateStepDropdown(data);
    };

    const createPhotoCardElement = (photo, stepId, isForViewer) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.dataset.id = photo.id;
        cardDiv.dataset.stepId = stepId;

        cardDiv.innerHTML = `
            <img src="${photo.image}" alt="${photo.title}" onerror="this.onerror=null;this.src='https://placehold.co/600x400/f2eee9/5a7d7c?text=Foto';">
            <div class="card-content">
                <h3>${photo.title || '...'}</h3>
                <p class="description">${photo.description}</p>
            </div>
        `;
        
        // Adiciona os botões de edição apenas se não for para a visualização do relatório
        if (!isForViewer) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'card-actions-editor';
            actionsDiv.innerHTML = `
                <button class="edit-btn" title="Editar">✎</button>
                <button class="delete-btn" title="Excluir">×</button>
            `;
            cardDiv.appendChild(actionsDiv);
        }

        return cardDiv;
    };

    const updateStepDropdown = (data) => {
        const hasSteps = data && data.length > 0;
        showPhotoModalBtn.style.display = hasSteps ? 'inline-block' : 'none';
        photoStepSelect.innerHTML = '';
        if (!hasSteps) {
            photoStepSelect.innerHTML = '<option disabled>Crie uma etapa primeiro</option>';
        } else {
            data.forEach(step => {
                const option = document.createElement('option');
                option.value = step.id;
                option.textContent = step.name;
                photoStepSelect.appendChild(option);
            });
        }
    };

    // --- LÓGICA DE MODAIS ---
    const openFormModal = (photoToEdit = null, stepId = null) => {
        addPhotoForm.reset();
        if (photoToEdit && stepId) {
            modalTitle.textContent = 'Editar Foto';
            savePhotoBtn.textContent = 'Salvar Alterações';
            photoIdEditInput.value = photoToEdit.id;
            document.getElementById('photo-step').value = stepId;
            document.getElementById('photo-image').value = photoToEdit.image;
            document.getElementById('photo-title').value = photoToEdit.title || '';
            document.getElementById('photo-description').value = photoToEdit.description;
        } else {
            modalTitle.textContent = 'Adicionar Nova Foto';
            savePhotoBtn.textContent = 'Salvar Foto';
            photoIdEditInput.value = '';
        }
        addPhotoModal.style.display = 'flex';
    };
    const closeFormModal = () => addPhotoModal.style.display = 'none';
    const openImageModal = (src) => { imageViewerModal.style.display = 'flex'; modalImage.src = src; };
    const closeImageModal = () => imageViewerModal.style.display = 'none';

    // --- EVENT LISTENERS ---
    downloadPdfBtn.addEventListener('click', generatePdf);

    addStepForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const stepName = stepNameInput.value.trim();
        if (stepName) {
            dataRef.push({ name: stepName, photos: {} });
            stepNameInput.value = '';
        }
    });

    addPhotoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const stepId = document.getElementById('photo-step').value;
        const photoId = photoIdEditInput.value || `photo-${Date.now()}`;
        const photoData = {
            id: photoId,
            image: document.getElementById('photo-image').value,
            title: document.getElementById('photo-title').value,
            description: document.getElementById('photo-description').value,
        };
        dataRef.child(`${stepId}/photos/${photoId}`).set(photoData);
        closeFormModal();
    });

    stepsContainer.addEventListener('click', (e) => {
        const target = e.target;

        // Listener para o botão de editar etapa
        if (target.classList.contains('edit-step-btn')) {
            const stepId = target.dataset.stepId;
            const step = localData.find(s => s.id === stepId);
            if (step) {
                const newName = prompt("Digite o novo nome para a etapa:", step.name);
                if (newName && newName.trim() !== "") {
                    dataRef.child(stepId).child('name').set(newName.trim());
                }
            }
            return;
        }

        if (target.classList.contains('delete-step-btn')) {
            const stepId = target.dataset.stepId;
            if (confirm('Tem certeza que deseja excluir esta etapa e TODAS as suas fotos?')) {
                dataRef.child(stepId).remove();
            }
            return;
        }
        
        const cardElement = target.closest('.card');
        if (!cardElement) return;
        const photoId = cardElement.dataset.id;
        const stepId = cardElement.dataset.stepId;
        const step = localData.find(s => s.id === stepId);
        const photo = step?.photos?.find(p => p.id === photoId);

        if (target.classList.contains('edit-btn') && photo) {
            openFormModal(photo, stepId);
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Tem certeza que deseja excluir esta foto?')) {
                dataRef.child(`${stepId}/photos/${photoId}`).remove();
            }
        } else if (target.tagName === 'IMG') {
            openImageModal(target.src);
        }
    });
    
    viewerContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'IMG') {
            openImageModal(e.target.src);
        }
    });

    // Demais eventos
    showPhotoModalBtn.addEventListener('click', () => openFormModal());
    cancelPhotoBtn.addEventListener('click', closeFormModal);
    closeImageModalBtn.addEventListener('click', closeImageModal);
    imageViewerModal.addEventListener('click', (e) => {
        if (e.target === imageViewerModal) closeImageModal();
    });

    const voltarAdminBtn = document.getElementById('voltar-admin-btn');
    if (voltarAdminBtn) {
        voltarAdminBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // --- SINCRONIZAÇÃO COM FIREBASE ---
    dataRef.on('value', (snapshot) => {
        const firebaseData = snapshot.val();
        const dataForRender = [];
        if (firebaseData) {
            for (const stepId in firebaseData) {
                const step = firebaseData[stepId];
                const photosArray = [];
                if (step.photos) {
                    for (const photoId in step.photos) {
                        photosArray.push(step.photos[photoId]);
                    }
                }
                dataForRender.push({
                    id: stepId,
                    name: step.name,
                    photos: photosArray
                });
            }
        }
        render(dataForRender);
    });
}
