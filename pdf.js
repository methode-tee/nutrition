
export function generatePDF(){

const { jsPDF } = window.jspdf;

const doc = new jsPDF();

doc.setFontSize(22);
doc.text('Méthode Tee — Rapport Premium',20,30);

doc.setFontSize(12);
doc.text('Évolution vitalité + terrain + recommandations.',20,50);

doc.save('rapport-methode-tee.pdf');
}
