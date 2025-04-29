document.addEventListener('DOMContentLoaded', () => {
    // --- Configurações ---
    const turmas = ['1ano', '2ano', '3ano'];
    const dias = ['seg', 'ter', 'qua', 'qui', 'sex'];
    const horariosManha = ['h1', 'h2', 'h3', 'h4', 'h5'];
    const horariosTarde = ['h6', 'h7', 'h8', 'h9', 'h10']; // Tarde completa
    const horariosTardeTerSex = ['h6','h7','h8','h9','h10']; // Aulas que podem ocorrer à tarde

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
                fetch('disciplinas.json'),
                fetch('alocacao.json')
            ]);

            if (!disciplinesRes.ok) throw new Error(`Erro ao carregar disciplinas.json: ${disciplinesRes.statusText}`);
            if (!allocationRes.ok) throw new Error(`Erro ao carregar alocacao.json: ${allocationRes.statusText}`);

            const disciplines = await disciplinesRes.json();
            const allocation = await allocationRes.json();

            // Criar um mapa de disciplinas para acesso rápido por ID
            const disciplineMap = disciplines.reduce((map, disc) => {
                map[disc.id] = disc;
                return map;
            }, {});

            return { disciplineMap, allocation };
        } catch (error) {
            console.error("Falha ao carregar dados JSON:", error);
            // Exibir mensagem de erro para o usuário, se apropriado
            document.querySelector('.timetable-container').innerHTML = `<p style="color:red; text-align:center;">Erro ao carregar dados do horário. Verifique os arquivos JSON e o console.</p>`;
            return null; // Indica que o carregamento falhou
        }
    }

    // --- Geração do HTML ---
    function generateTimetableHTML(turmaId, disciplineMap, allocation) {
        const section = document.createElement('section');
        section.className = 'turma-schedule';
        section.id = `turma-${turmaId}`;

        const title = document.createElement('h2');
        title.className = 'turma-title';
        // Extrai o número do ano do ID da turma
        const anoNumero = turmaId.match(/\d+/)?.[0] || turmaId;
        title.textContent = `Horário - ${anoNumero}º Ano`;
        section.appendChild(title);

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Cabeçalho da Tabela (Dias)
        const headerRow = document.createElement('tr');
        const thHora = document.createElement('th');
        thHora.className = 'time-header-col';
        thHora.textContent = 'Horário';
        headerRow.appendChild(thHora);
        dias.forEach(dia => {
            const thDia = document.createElement('th');
            thDia.textContent = dia.charAt(0).toUpperCase() + dia.slice(1); // Capitaliza (Segunda, Terça...)
            headerRow.appendChild(thDia);
        });
        thead.appendChild(headerRow);

        // Corpo da Tabela (Horários e Slots)
        [...horariosManha, ...horariosTarde].forEach((hora, index) => {
            // Adiciona separador da tarde
            if (hora === 'h6' && index > 0) { // Adiciona antes da primeira linha da tarde
                 const separatorRow = document.createElement('tr');
                 separatorRow.className = 'afternoon-separator';
                 const separatorCell = document.createElement('td');
                 separatorCell.colSpan = dias.length + 1; // Colspan total
                 separatorCell.textContent = 'TARDE';
                 separatorRow.appendChild(separatorCell);
                 tbody.appendChild(separatorRow);
            }

            const tr = document.createElement('tr');
             // Adiciona classe específica para linhas da tarde
             if (horariosTarde.includes(hora)) {
                tr.classList.add('afternoon-row');
            }

            // Célula do Horário
            const tdHora = document.createElement('td');
            tdHora.className = 'time-label';
            tdHora.textContent = horarioLabels[hora] || hora;
             if (horariosTarde.includes(hora)) {
                tdHora.classList.add('afternoon-label'); // Estilo diferente para label da tarde
            }
            tr.appendChild(tdHora);

            // Células dos Slots (Dias)
            dias.forEach(dia => {
                const tdSlot = document.createElement('td');
                const slotId = `${turmaId}_${dia}_${hora}`;
                tdSlot.className = 'timetable-slot';
                tdSlot.dataset.day = dia;
                tdSlot.dataset.time = hora;
                tdSlot.dataset.turma = turmaId;

                // Verifica se o slot é da tarde e não é Terça ou Sexta (para aulas movidas)
                const isAfternoon = horariosTarde.includes(hora);
                const isUnavailableAfternoon = isAfternoon && dia !== 'ter' && dia !== 'sex';
                const isUnavailableAfternoonSex = isAfternoon && dia == 'sex' && !horariosTardeTerSex.includes(hora)


                if (isUnavailableAfternoon || isUnavailableAfternoonSex) {
                    tdSlot.classList.add('unavailable');
                } else {
                     if (isAfternoon) {
                         tdSlot.classList.add('afternoon-slot'); // Adiciona classe para slot da tarde válido
                     }
                    // Verifica alocação
                    const disciplineId = allocation[slotId];
                    if (disciplineId && disciplineMap[disciplineId]) {
                        const disc = disciplineMap[disciplineId];
                        const card = document.createElement('div');
                        card.id = `card_${slotId}`; // ID único baseado no slot
                        card.className = `discipline-card ${disc.cssClass || ''}`;
                        card.draggable = true;
                        // Adapta o texto do card - pode incluir blockHours ou profKey se desejar
                        card.textContent = `${disc.shortName} (${disc.blockHours}h)`;
                        // Adicionar data attributes extras ao card se necessário
                        // card.dataset.disciplineId = disc.id;
                        // card.dataset.professor = disc.professorKey;
                        tdSlot.appendChild(card);
                    } else if (!disciplineId && !isAfternoon && !isUnavailableAfternoonSex){ // Slot vazio na manhã
                        tdSlot.classList.add('empty-slot');
                    } else if (!disciplineId && isAfternoon && !isUnavailableAfternoon && !isUnavailableAfternoonSex){ // Slot vazio na tarde permitida
                         tdSlot.classList.add('empty-afternoon');
                    }
                    // Se for um slot explicitamente 'null' ou ID não encontrado, fica vazio
                }
                tr.appendChild(tdSlot);
            });
            tbody.appendChild(tr);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        section.appendChild(table);

        return section;
    }

    // --- Inicialização do Drag and Drop (Mesma lógica da resposta anterior) ---
    function initializeDragDrop() {
        const cards = document.querySelectorAll('.discipline-card:not(.moved-placeholder)');
        const slots = document.querySelectorAll('.timetable-slot');

        let draggedCard = null;
        let originalSlot = null;

        function clearDropStyles() {
            slots.forEach(slot => slot.classList.remove('drag-over'));
        }

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                 if (!e.target.classList.contains('discipline-card') || e.target.classList.contains('moved-placeholder')) {
                    e.preventDefault(); return;
                 }
                draggedCard = e.target;
                originalSlot = draggedCard.parentNode;
                setTimeout(() => draggedCard.classList.add('dragging'), 0);
            });

            card.addEventListener('dragend', () => {
                if (draggedCard) draggedCard.classList.remove('dragging');
                clearDropStyles();
                draggedCard = null; originalSlot = null;
            });
        });

        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (slot !== originalSlot && !slot.classList.contains('unavailable')) {
                     slot.classList.add('drag-over');
                }
            });

            slot.addEventListener('dragleave', (e) => {
                 if (e.target === slot) slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                clearDropStyles();
                const targetSlot = e.target.closest('.timetable-slot');

                if (!targetSlot || targetSlot.classList.contains('unavailable') || !draggedCard || !originalSlot) return;

                const targetCard = targetSlot.querySelector('.discipline-card:not(.moved-placeholder)');

                if (!targetCard && targetSlot !== originalSlot) { // Move para vazio
                     targetSlot.appendChild(draggedCard);
                } else if (targetCard && targetCard !== draggedCard && targetSlot !== originalSlot) { // Troca (Swap)
                    originalSlot.appendChild(targetCard);
                    targetSlot.appendChild(draggedCard);
                }
                 // dragend limpará draggedCard/originalSlot
            });
        });
        console.log("Drag and Drop inicializado.");
    }


    // --- Função Principal de Inicialização ---
    async function init() {
        const data = await loadData();
        if (!data) return; // Sai se o carregamento falhou

        const { disciplineMap, allocation } = data;
        const container = document.querySelector('.timetable-container');
        container.innerHTML = ''; // Limpa o container antes de adicionar

        turmas.forEach(turmaId => {
            const scheduleHTML = generateTimetableHTML(turmaId, disciplineMap, allocation);
            container.appendChild(scheduleHTML);
        });

        // IMPORTANTE: Inicializar o Drag and Drop DEPOIS que o HTML foi gerado e inserido no DOM
        initializeDragDrop();
    }

    // --- Executa a Inicialização ---
    init();

});