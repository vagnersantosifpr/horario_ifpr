document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.discipline-card');
    const slots = document.querySelectorAll('.timetable-slot');

    // Guarda a referência do card sendo arrastado
    let draggedCard = null;

    // Adiciona listeners aos cards
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            draggedCard = e.target; // Guarda o elemento sendo arrastado
            setTimeout(() => e.target.classList.add('dragging'), 0); // Adiciona estilo (com timeout para visualização)
            // console.log(`Drag Start: ${draggedCard.id}`);
        });

        card.addEventListener('dragend', (e) => {
            // Certifica-se de remover a classe dragging mesmo se o drop falhar ou for cancelado
             if (draggedCard) { // Verifica se draggedCard ainda existe
                draggedCard.classList.remove('dragging');
             }
            draggedCard = null; // Limpa a referência
            // console.log("Drag End");

            // Remove classe 'drag-over' de todos os slots para limpar o estado visual
             slots.forEach(slot => slot.classList.remove('drag-over'));
        });
    });

    // Adiciona listeners aos slots (células da tabela)
    slots.forEach(slot => {
        slot.addEventListener('dragover', (e) => {
            e.preventDefault(); // Essencial para permitir o drop!
            e.target.classList.add('drag-over'); // Estilo visual
            // console.log(`Drag Over: ${e.target.dataset.day}-${e.target.dataset.time}-${e.target.dataset.turma}`);
        });

        slot.addEventListener('dragleave', (e) => {
            e.target.classList.remove('drag-over'); // Remove estilo visual
            // console.log(`Drag Leave: ${e.target.dataset.day}-${e.target.dataset.time}-${e.target.dataset.turma}`);
        });

        slot.addEventListener('drop', (e) => {
            e.preventDefault(); // Previne comportamento padrão (abrir como link, etc.)
            e.target.classList.remove('drag-over'); // Limpa o estilo

            if (draggedCard && e.target.classList.contains('timetable-slot')) {
                 // console.log(`Drop: ${draggedCard.id} onto ${e.target.dataset.day}-${e.target.dataset.time}-${e.target.dataset.turma}`);

                // Verifica se o slot já tem um card (exceto o próprio card sendo arrastado)
                const existingCard = e.target.querySelector('.discipline-card');

                if (!existingCard) {
                    // Se o slot estiver vazio, apenas move o card
                    e.target.appendChild(draggedCard);
                    // console.log(`${draggedCard.id} moved to empty slot.`);
                } else if (existingCard && existingCard !== draggedCard) {
                    // Se o slot NÃO estiver vazio e não for o próprio card sendo arrastado
                    // Implementação simples: Não permite o drop (ou poderia implementar troca)
                    console.log("Slot já ocupado. Troca não implementada nesta versão.");
                    // Para implementar a troca:
                    // 1. Pegar o pai original do draggedCard (draggedCard.parentNode)
                    // 2. Mover o existingCard para o pai original
                    // 3. Mover o draggedCard para o e.target (slot atual)
                    // Isso pode ficar complexo se o slot original também tinha um card.
                    // Por simplicidade, vamos apenas impedir o drop em slots ocupados.
                    // O 'dragend' vai limpar o estado 'dragging'.
                }
                 // Se existingCard === draggedCard, não faz nada (soltou no mesmo lugar)

            } else if (draggedCard && e.target.classList.contains('discipline-card')) {
                 // Tentou soltar diretamente em cima de OUTRO card
                 const targetSlot = e.target.closest('.timetable-slot');
                 if (targetSlot && targetSlot !== draggedCard.parentNode) {
                     console.log("Slot já ocupado (drop sobre outro card). Troca não implementada.");
                     // Poderia implementar a troca aqui também, movendo e.target para draggedCard.parentNode
                 }
            }

            // Garante que a classe dragging seja removida após o drop,
            // mesmo que a lógica de drop não mova o elemento.
             if (draggedCard) {
                draggedCard.classList.remove('dragging');
             }
             // dragend fará a limpeza final de draggedCard = null;
        });
    });
});