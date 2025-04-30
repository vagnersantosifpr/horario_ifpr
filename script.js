document.addEventListener('DOMContentLoaded', () => {
    // --- Configurações ---
    const turmas = ['1ano', '2ano', '3ano'];
    const dias = ['seg', 'ter', 'qua', 'qui', 'sex'];
    const horariosManha = ['h1', 'h2', 'h3', 'h4', 'h5'];
    const horariosTarde = ['h6', 'h7', 'h8', 'h9', 'h10'];
    const horariosValidosTarde = { // Horários onde *geralmente* há aula à tarde
        'ter': ['h6', 'h7', 'h8', 'h9', 'h10'],
        'sex': ['h6'] // Apenas H6 usado na sexta neste exemplo
    };

    const horarioLabels = {
        h1: "H1 (07:30)", h2: "H2 (08:20)", h3: "H3 (09:25)",
        h4: "H4 (10:15)", h5: "H5 (11:05)", h6: "H6 (Tarde)",
        h7: "H7 (Tarde)", h8: "H8 (Tarde)", h9: "H9 (Tarde)",
        h10: "H10 (Tarde)"
    };

    // --- Carregamento de Dados ---
    async function loadData() {
        try {
            const [disciplinesRes, allocationRes] = await Promise.all([
                fetch('disciplines.json'),
                fetch('allocation.json')
            ]);
            if (!disciplinesRes.ok) throw new Error(`Erro ao carregar disciplines.json: ${disciplinesRes.statusText}`);
            if (!allocationRes.ok) throw new Error(`Erro ao carregar allocation.json: ${allocationRes.statusText}`);
            const disciplines = await disciplinesRes.json();
            const allocation = await allocationRes.json();
            const disciplineMap = disciplines.reduce((map, disc) => { map[disc.id] = disc; return map; }, {});
            console.log("Dados JSON carregados com sucesso.");
            return { disciplineMap, allocation };
        } catch (error) {
            console.error("Falha ao carregar dados JSON:", error);
            document.querySelector('.timetable-container').innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar dados. Verifique os arquivos JSON e o console.</p>`;
            return null;
        }
    }

    // --- Geração do HTML ---
    function generateTimetableHTML(turmaId, disciplineMap, allocation) {
        const section = document.createElement('section');
        section.className = 'turma-schedule'; section.id = `turma-${turmaId}`;
        const title = document.createElement('h2');
        title.className = 'turma-title';
        const anoNumero = turmaId.match(/\d+/)?.[0] || turmaId;
        title.textContent = `Horário - ${anoNumero}º Ano`;
        section.appendChild(title);
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        const thHora = document.createElement('th');
        thHora.className = 'time-header-col'; thHora.textContent = 'Horário'; headerRow.appendChild(thHora);
        dias.forEach(dia => { const thDia = document.createElement('th'); thDia.textContent = dia.charAt(0).toUpperCase() + dia.slice(1); headerRow.appendChild(thDia); });
        thead.appendChild(headerRow);

        [...horariosManha, ...horariosTarde].forEach((hora, index) => {
            if (hora === 'h6' && index > 0) { /* Separador Tarde */
                 const sepRow = document.createElement('tr'); sepRow.className = 'afternoon-separator';
                 const sepCell = document.createElement('td'); sepCell.colSpan = dias.length + 1; sepCell.textContent = 'TARDE';
                 sepRow.appendChild(sepCell); tbody.appendChild(sepRow);
            }
            const tr = document.createElement('tr');
             const isAfternoonRow = horariosTarde.includes(hora);
             if (isAfternoonRow) tr.classList.add('afternoon-row');
            const tdHora = document.createElement('td');
            tdHora.className = 'time-label'; tdHora.textContent = horarioLabels[hora] || hora;
             if (isAfternoonRow) tdHora.classList.add('afternoon-label');
            tr.appendChild(tdHora);

            dias.forEach(dia => {
                const tdSlot = document.createElement('td');
                const slotId = `${turmaId}_${dia}_${hora}`;
                tdSlot.className = 'timetable-slot';
                tdSlot.dataset.day = dia; tdSlot.dataset.time = hora; tdSlot.dataset.turma = turmaId;

                // <<< MUDANÇA AQUI >>>: Lógica de classes visuais, sem 'unavailable' para funcionalidade
                if (isAfternoonRow) {
                    // Verifica se é um horário da tarde "normalmente" sem aula
                    if (!horariosValidosTarde[dia] || !horariosValidosTarde[dia].includes(hora)) {
                         // Adiciona classe APENAS para estilo visual, não para bloquear
                         tdSlot.classList.add('non-scheduled-afternoon'); // << Nova classe visual
                    } else {
                         // Horário da tarde "normal" (Terça / Sex H6)
                         tdSlot.classList.add('afternoon-slot');
                    }
                }

                // Tenta preencher com a disciplina alocada
                const disciplineId = allocation[slotId];
                if (disciplineId && disciplineMap[disciplineId]) {
                    const disc = disciplineMap[disciplineId];
                    const card = document.createElement('div');
                    card.id = `card_${slotId}_${disc.id}`;
                    card.className = `discipline-card ${disc.cssClass || ''}`;
                    card.draggable = true;
                    card.dataset.professorKey = disc.professorKey;
                    card.dataset.disciplineId = disc.id;
                    card.textContent = `${disc.shortName} (${disc.blockHours}h)`;
                    tdSlot.appendChild(card);
                } else {
                    // Slot está vazio
                    if(isAfternoonRow) {
                        // Adiciona classe de vazio da tarde (pode ser a mesma .non-scheduled-afternoon ou outra)
                        if (!tdSlot.classList.contains('non-scheduled-afternoon')) {
                             tdSlot.classList.add('empty-afternoon');
                        }
                    } else {
                        tdSlot.classList.add('empty-slot'); // Vazio na manhã
                    }
                }
                tr.appendChild(tdSlot);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(thead); table.appendChild(tbody); section.appendChild(table);
        return section;
    }

    // --- Inicialização do Drag and Drop ---
    function initializeDragDrop() {
        const cards = document.querySelectorAll('.discipline-card:not(.moved-placeholder)');
        // <<< MUDANÇA AQUI >>>: Seleciona TODOS os slots, não exclui mais '.unavailable'
        const slots = document.querySelectorAll('.timetable-slot');

        let draggedCard = null;
        let originalSlot = null;

        function clearDropStyles() {
             document.querySelectorAll('.timetable-slot').forEach(slot => slot.classList.remove('drag-over'));
        }

        console.log(`Inicializando Drag & Drop para ${cards.length} cards e ${slots.length} slots.`); // Agora seleciona todos

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                 if (!e.target.classList.contains('discipline-card') || e.target.classList.contains('moved-placeholder')) { e.preventDefault(); return; }
                draggedCard = e.target;
                originalSlot = draggedCard.parentNode;
                setTimeout(() => { if(draggedCard) draggedCard.classList.add('dragging') }, 0);
                console.log(`Drag Start: Card ID ${draggedCard.dataset.disciplineId || draggedCard.id}, Saindo de ${originalSlot.dataset.turma} ${originalSlot.dataset.day} ${originalSlot.dataset.time}`);
            });
            card.addEventListener('dragend', () => {
                if (draggedCard) draggedCard.classList.remove('dragging');
                clearDropStyles();
                draggedCard = null; originalSlot = null;
                console.log("Drag End");
            });
        });

        // Adiciona listeners a TODOS os slots agora
        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                // <<< MUDANÇA AQUI >>>: Não precisa mais verificar 'unavailable' aqui
                if (slot !== originalSlot) {
                     slot.classList.add('drag-over');
                }
            });

            slot.addEventListener('dragleave', (e) => {
                 if (e.target === slot || !slot.contains(e.relatedTarget)) {
                    slot.classList.remove('drag-over');
                 }
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                // <<< MUDANÇA AQUI >>>: Usa closest('.timetable-slot') sem :not(.unavailable)
                const targetSlot = e.target.closest('.timetable-slot');

                // <<< MUDANÇA AQUI >>>: Remove a verificação de targetSlot.classList.contains('unavailable')
                if (!targetSlot || !draggedCard || !originalSlot) {
                    console.warn("Drop ignorado: estado inválido (targetSlot, draggedCard ou originalSlot ausente).");
                    clearDropStyles();
                    return;
                }

                 targetSlot.classList.remove('drag-over'); // Limpa estilo do alvo
                 clearDropStyles(); // Limpa geral

                const targetCard = targetSlot.querySelector('.discipline-card:not(.moved-placeholder)');
                console.log(`Drop target slot: ${targetSlot.dataset.turma} ${targetSlot.dataset.day} ${targetSlot.dataset.time}. Found card inside:`, targetCard ? (targetCard.dataset.disciplineId || targetCard.id) : 'Nenhum');

                // Lógica de Mover para Vazio ou Trocar (Swap) permanece a mesma
                if (!targetCard && targetSlot !== originalSlot) {
                     console.log(`--> Movendo ${draggedCard.dataset.disciplineId || draggedCard.id} para slot VAZIO.`);
                     targetSlot.appendChild(draggedCard);
                } else if (targetCard && targetCard !== draggedCard && targetSlot !== originalSlot) {
                    console.log(`--> Trocando ${draggedCard.dataset.disciplineId || draggedCard.id} com ${targetCard.dataset.disciplineId || targetCard.id}.`);
                    originalSlot.appendChild(targetCard);
                    targetSlot.appendChild(draggedCard);
                } else {
                     console.log("--> Nenhuma ação de movimentação necessária.");
                }
            });
        });
        console.log("Listeners de Drag and Drop configurados para todos os slots.");
    }


    // --- Função Principal de Inicialização ---
    async function init() {
        console.log("Iniciando carregamento e geração do horário...");
        const data = await loadData();
        if (!data) { console.error("Falha na inicialização."); return; }
        const { disciplineMap, allocation } = data;
        const container = document.querySelector('.timetable-container');
        container.innerHTML = '';
        turmas.forEach(turmaId => {
            console.log(`Gerando tabela para ${turmaId}...`);
            const scheduleHTML = generateTimetableHTML(turmaId, disciplineMap, allocation);
            container.appendChild(scheduleHTML);
        });
        console.log("Geração do HTML concluída.");
        initializeDragDrop(); // Chama DEPOIS que o HTML está no DOM


        // <<< NOVO CÓDIGO AQUI >>>
        // --- Adiciona Listener ao Botão Salvar ---
        const saveButton = document.getElementById('saveButton');
        if (saveButton) {
            saveButton.addEventListener('click', function(event) {
                event.preventDefault(); // Previne qualquer comportamento padrão do botão

                // Exibe a mensagem de alerta personalizada
                alert("Você achou que seria tão fácil alterar o horário.. Na na ni na não.. Você precisa se logar como Administrador para efetivar a alteração");

                console.log("Tentativa de salvar bloqueada. Mensagem exibida."); // Log para o console do desenvolvedor
            });
            console.log("Listener do botão 'Salvar Alterações' configurado.");
        } else {
            console.error("Elemento do botão 'Salvar Alterações' (ID: saveButton) não encontrado no DOM.");
        }
         // <<< FIM DO NOVO CÓDIGO >>>


    }

    // --- Executa a Inicialização ---
    init();
});