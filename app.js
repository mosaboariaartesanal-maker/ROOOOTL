const STORAGE_KEY = "atelie_rotulos_v3";
const fields = ["nome","tipo","peso","descricao","destaque","composicao","modo","atencao","fabricacao","validade","telefone","instagram","email","endereco","qr","marca","logoUrl"];
let labels = loadLabels();
let toastTimer;
const $ = id => document.getElementById(id);

function loadLabels(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); }catch(e){return []}
}

function persist(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    renderRepository();
    refreshPrintSelect();
    renderCustomBatchList();
  } catch(e) {
    console.error(e);
    notify("Erro: Armazenamento cheio ou imagem muito grande.");
  }
}

function uid(){return "rotulo_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,7)}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function value(id){
  const el = $(id);
  if(!el) return "";
  return el.value ? el.value.trim() : "";
}
function notify(msg){
  const el=$("toast");
  if(!el) return;
  el.textContent=msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),3500);
}

const sidebar = $("sidebar");
const overlay = $("sidebar-overlay");
function toggleSidebar(open){
  if(sidebar) sidebar.classList.toggle("open", open);
  if(overlay) overlay.classList.toggle("open", open);
}
if($("menu-toggle")) $("menu-toggle").addEventListener("click", ()=>toggleSidebar(true));
if($("close-sidebar")) $("close-sidebar").addEventListener("click", ()=>toggleSidebar(false));
if(overlay) overlay.addEventListener("click", ()=>toggleSidebar(false));

function switchTab(tab){
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));
  document.querySelectorAll(".tab-panel").forEach(p=>p.classList.toggle("active",p.id==="tab-"+tab));
  const titles={cadastro:"Cadastro de rótulo",repositorio:"Repositório de rótulos",gerados:"Gerador PDF",backup:"Backup & Dados"};
  if($("page-title")) $("page-title").textContent=titles[tab];
  if(tab==="gerados"){
    updatePreview();
    renderCustomBatchList();
  }
  toggleSidebar(false);
  window.scrollTo({top:0, behavior:"smooth"});
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));

function resetForm(){ 
  const form = $("label-form");
  if(form) form.reset();
  if($("label-id")) $("label-id").value="";
  if($("tipo")) $("tipo").value="Sabonete artesanal";
  if($("peso")) $("peso").value="100g";
  if($("descricao")) $("descricao").value="Elaborado artesanalmente com ingredientes selecionados, proporciona uma limpeza suave, cuidado especial com a pele e um agradável sensação de hidratação e bem-estar. Um toque de carinho e delicadeza em cada banho.";
  if($("modo")) $("modo").value="Aplique o sabonete sobre a pele úmida, massageando suavemente até formar espuma. Em seguida, enxáge abundantemente com água.";
  if($("atencao")) $("atencao").value="USO EXTERNO. Mantenha fora do alcance de crianças. Não utilize sobe a pele ferida ou irritada. Evite contato com os olhos. Em caso de contato, enxágue abundantemente com água. Em caso de irritação, suspenda o uso.";
  
  if($("telefone")) $("telefone").value="(31) 9 8885-2567";
  if($("instagram")) $("instagram").value="@mosaboaria";
  if($("email")) $("email").value="mosaboariaartesanal@gmail.com";
  if($("endereco")) $("endereco").value="Contagem/MG - Brasil";
  if($("marca")) $("marca").value="Mô Saboaria";

  if($("logoUrl")) $("logoUrl").value="";
  if($("logo-file")) $("logo-file").value="";
  if($("logo-preview-wrap")) $("logo-preview-wrap").style.display="none";
  if($("page-title")) $("page-title").textContent="Cadastro de rótulo"; 
}

if($("new-label")) $("new-label").addEventListener("click",()=>{resetForm();switchTab("cadastro");});
if($("clear-form")) $("clear-form").addEventListener("click",resetForm);

if($("logo-file")){
  $("logo-file").addEventListener("change", e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(evt){
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement("canvas");
        const MAX_W = 300, MAX_H = 200;
        let w = img.width, h = img.height;
        if(w > h){ if(w > MAX_W){ h *= MAX_W / w; w = MAX_W; } }
        else { if(h > MAX_H){ w *= MAX_H / h; h = MAX_H; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png", 0.9);
        $("logoUrl").value = dataUrl;
        if($("logo-preview-img")){
          $("logo-preview-img").src = dataUrl;
          $("logo-preview-wrap").style.display = "flex";
        }
        notify("Logomarca carregada com sucesso!");
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

if($("remove-logo-btn")){
  $("remove-logo-btn").addEventListener("click", () => {
    if($("logoUrl")) $("logoUrl").value = "";
    if($("logo-file")) $("logo-file").value = "";
    if($("logo-preview-wrap")) $("logo-preview-wrap").style.display = "none";
    notify("Logomarca removida.");
  });
}

if($("label-form")){
  $("label-form").addEventListener("submit", e => {
    e.preventDefault();
    const data={};
    fields.forEach(f=>data[f]=value(f));
    
    data.telefone = "(31) 9 8885-2567";
    data.instagram = "@mosaboaria";
    data.email = "mosaboariaartesanal@gmail.com";
    data.endereco = "Contagem/MG - Brasil";
    data.marca = "Mô Saboaria";

    if(!data.nome || !data.composicao || !data.modo){
      notify("Preencha o nome do sabonete, composição e modo de usar.");
      return;
    }
    const id = $("label-id").value;
    const now = new Date().toISOString();
    if(id){
      const i = labels.findIndex(x=>x.id===id);
      if(i>=0) labels[i] = {...labels[i], ...data, updatedAt:now};
    } else {
      labels.unshift({id:uid(), ...data, createdAt:now, updatedAt:now});
    }
    persist();
    resetForm();
    notify(id?"Rótulo atualizado com sucesso!":"Rótulo salvo no repositório!");
    switchTab("repositorio");
  });
}

function renderRepository(){
  const grid=$("repo-grid");
  if(!grid) return;
  let list=[...labels];
  const searchInput = $("repo-search");
  const q = searchInput ? searchInput.value.toLowerCase().trim() : "";
  list = list.filter(x=>(x.nome+" "+x.marca+" "+x.destaque).toLowerCase().includes(q));
  const sortSelect = $("repo-sort");
  const sort = sortSelect ? sortSelect.value : "recent";
  if(sort==="az") list.sort((a,b)=>a.nome.localeCompare(b.nome,"pt-BR"));
  if(sort==="za") list.sort((a,b)=>b.nome.localeCompare(a.nome,"pt-BR"));
  
  if($("repo-count")) $("repo-count").innerHTML = String(labels.length).padStart(2,"0")+" <span>rótulos</span>";
  
  if(!list.length){
    grid.innerHTML=`<div class="empty-state"><strong>${labels.length?"Nenhum resultado encontrado":"Repositório Vazio"}</strong>${labels.length?"Tente outro termo de busca.":"Cadastre seu primeiro sabonete para começar."}<br><br><button class="button primary" onclick="switchTab('cadastro')">＋ Cadastrar Rótulo</button></div>`;
    return;
  }
  grid.innerHTML = list.map(x=>`
    <article class="label-card">
      <div class="mini-label">
        <h4>${escapeHtml(x.nome)}</h4>
        <div class="mini-sub">${escapeHtml(x.tipo||"Sabonete artesanal")}</div>
        <p>${escapeHtml(x.descricao||x.destaque||x.composicao)}</p>
      </div>
      <div class="card-title">${escapeHtml(x.nome)}</div>
      <div class="card-meta">${escapeHtml(x.peso||"100g")} · ${escapeHtml(x.marca||"Mô Saboaria")}</div>
      <div class="card-actions">
        <button class="button ghost" onclick="editLabel('${x.id}')">Editar</button>
        <button class="button ghost" onclick="sendToPrint('${x.id}')">Gerar PDF</button>
        <button class="button ghost" onclick="duplicateLabel('${x.id}')">Duplicar</button>
        <button class="button ghost" onclick="deleteLabel('${x.id}')">Excluir</button>
      </div>
    </article>
  `).join("");
}

if($("repo-search")) $("repo-search").addEventListener("input", renderRepository);
if($("repo-sort")) $("repo-sort").addEventListener("change", renderRepository);

function editLabel(id){
  const x = labels.find(item=>item.id===id);
  if(!x) return;
  fields.forEach(f=>{ if($(f)) $(f).value = x[f]||""; });
  
  if($("telefone")) $("telefone").value = "(31) 9 8885-2567";
  if($("instagram")) $("instagram").value = "@mosaboaria";
  if($("email")) $("email").value = "mosaboariaartesanal@gmail.com";
  if($("endereco")) $("endereco").value = "Contagem/MG - Brasil";
  if($("marca")) $("marca").value = "Mô Saboaria";

  if(x.logoUrl && $("logo-preview-wrap")){
    $("logo-preview-img").src = x.logoUrl;
    $("logo-preview-wrap").style.display = "flex";
  } else if($("logo-preview-wrap")) {
    $("logo-preview-wrap").style.display = "none";
  }
  if($("label-id")) $("label-id").value = x.id;
  switchTab("cadastro");
  if($("page-title")) $("page-title").textContent = "Editar rótulo";
}

function duplicateLabel(id){
  const x = labels.find(item=>item.id===id);
  if(!x) return;
  const copy = {...x, id:uid(), nome:x.nome+" (cópia)", createdAt:new Date().toISOString()};
  labels.unshift(copy);
  persist();
  notify("Cópia criada no repositório!");
}

function deleteLabel(id){
  const x = labels.find(item=>item.id===id);
  if(!x) return;
  if(!confirm(`Deseja excluir o rótulo "${x.nome}"?`)) return;
  labels = labels.filter(item=>item.id!==id);
  persist();
  notify("Rótulo excluído.");
}

function refreshPrintSelect(selected=""){
  const select = $("print-select");
  if(!select) return;
  const current = selected || select.value;
  select.innerHTML = '<option value="">Selecione um sabonete...</option>' + labels.map(x=>`<option value="${x.id}">${escapeHtml(x.nome)}</option>`).join("");
  if(labels.some(x=>x.id===current)) select.value = current;
  updatePreview();
}

function sendToPrint(id){
  switchTab("gerados");
  refreshPrintSelect(id);
  if($("print-select")) $("print-select").value = id;
  if($("print-mode")) $("print-mode").value = "single";
  updatePreview();
}

if($("print-select")) $("print-select").addEventListener("change", updatePreview);

if($("print-mode")) $("print-mode").addEventListener("change", (e)=>{
  const mode = e.target.value;
  if($("single-select-wrap")) $("single-select-wrap").style.display = mode === "single" ? "flex" : "none";
  if($("custom-batch-wrap")) $("custom-batch-wrap").style.display = mode === "custom_batch" ? "block" : "none";
  if($("pages-select-wrap")) $("pages-select-wrap").style.display = mode === "custom_batch" ? "none" : "flex";
  updatePreview();
});

function renderCustomBatchList(){
  const container = $("custom-batch-list");
  if(!container) return;
  if(!labels.length){
    container.innerHTML = `<div style="padding:10px; text-align:center; color:var(--text-secondary); font-size:12px;">Nenhum rótulo cadastrado.</div>`;
    return;
  }
  container.innerHTML = labels.map(x=>`
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; background:#fff; padding:10px 14px; border:1px solid var(--border); border-radius:10px;">
      <span style="font-size:13px; font-weight:600; color:var(--text-primary); overflow-wrap:anywhere;">${escapeHtml(x.nome)}</span>
      <input type="number" min="0" max="100" value="0" data-id="${x.id}" class="batch-qty-input" style="width:75px; padding:6px 10px; text-align:center; font-weight:600; border-radius:8px; border:1px solid var(--border);">
    </div>
  `).join("");

  container.querySelectorAll(".batch-qty-input").forEach(input=>{
    input.addEventListener("input", updateCustomBatchTotal);
  });
  updateCustomBatchTotal();
}

function updateCustomBatchTotal(){
  const container = $("custom-batch-list");
  if(!container) return;
  let total = 0;
  container.querySelectorAll(".batch-qty-input").forEach(input=>{
    total += Math.max(0, parseInt(input.value) || 0);
  });
  if($("custom-batch-total")) $("custom-batch-total").textContent = total;
}

function updatePreview(){
  const previewEl = $("label-preview");
  if(!previewEl) return;
  const mode = $("print-mode") ? $("print-mode").value : "single";
  updateDimensionSummary();
  
  if(mode === "mixed"){
    previewEl.className = "label-preview";
    previewEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; text-align:center; padding:20px; font-weight:600; color:var(--brand-primary);"><span style="font-size:24px; margin-bottom:8px;">▧</span>Modo Variado Automático Ativado<br><small style="font-weight:normal; color:var(--text-secondary); margin-top:6px;">O PDF incluirá o ciclo completo com todos os sabonetes cadastrados.</small></div>`;
    return;
  }
  
  if(mode === "custom_batch"){
    previewEl.className = "label-preview";
    previewEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; width:100%; height:100%; text-align:center; padding:20px; font-weight:600; color:var(--brand-primary);"><span style="font-size:24px; margin-bottom:8px;">⇅</span>Lote Personalizado Ativado<br><small style="font-weight:normal; color:var(--text-secondary); margin-top:6px;">O PDF seguirá as quantidades estipuladas na lista ao lado.</small></div>`;
    return;
  }

  const x = labels.find(item=>item.id===($("print-select")?$("print-select").value:""));
  if(!x){
    previewEl.className = "label-preview empty-preview";
    previewEl.textContent = "Selecione um rótulo para visualizar";
    return;
  }
  previewEl.className = "label-preview";
  const logoToUse = x.logoUrl || "";

  previewEl.innerHTML = `
    <div class="preview-left">
      ${logoToUse ? `<div class="preview-logo-wrap"><img src="${logoToUse}" class="preview-logo-img" alt="Logo"></div>` : ''}
      <h2>${escapeHtml(x.nome)}</h2>
      <div class="preview-type">${escapeHtml(x.tipo||"SABONETE ARTESANAL")}</div>
      <p class="preview-desc">${escapeHtml(x.descricao||"")}</p>
      ${x.destaque?`<div class="preview-highlight-center">${escapeHtml(x.destaque.toUpperCase().replace(/^COM\s+/i,''))}</div>`:''}
      <div class="preview-weight">${escapeHtml(x.peso||"100g")}</div>
    </div>
    <div class="preview-right">
      <div class="preview-sections-wrap">
        <div class="preview-section"><b>COMPOSIÇÃO</b><p>${escapeHtml(x.composicao||"")}</p></div>
        <div class="preview-section"><b>MODO DE USAR</b><p>${escapeHtml(x.modo||"")}</p></div>
        ${x.atencao?`<div class="preview-section"><b>ATENÇÃO</b><p>${escapeHtml(x.atencao)}</p></div>`:''}
      </div>
      <div class="preview-bottom">
        <div class="preview-contact">
          ${escapeHtml(["(31) 9 8885-2567", "@mosaboaria", "mosaboariaartesanal@gmail.com"].filter(Boolean).join(" · "))}
          <div class="preview-address-line">${escapeHtml(["Mô Saboaria", "Contagem/MG - Brasil"].filter(Boolean).join(" · "))}</div>
          <div class="preview-dates-line"><strong>${escapeHtml([x.fabricacao?"FAB: "+x.fabricacao:"", x.validade?"VAL: "+x.validade:""].filter(Boolean).join(" · "))}</strong></div>
        </div>
        <div class="preview-qr-wrap"><div id="preview-qr" class="preview-qr"></div><small>INSTAGRAM</small></div>
      </div>
    </div>`;
  renderPreviewQR();
}

async function renderPreviewQR(){
  const el = $("preview-qr");
  if(!el) return;
  el.innerHTML="";
  if(!window.QRCode) await ensureQRCodeLibrary();
  if(window.QRCode){
    new QRCode(el, {text:"https://www.instagram.com/mosaboaria/", width:128, height:128, colorDark:"#000000", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.M});
  } else {
    el.textContent="QR";
  }
}

async function ensureQRCodeLibrary(){
  if(window.QRCode) return true;
  const urls=["https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js","https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"];
  for(const src of urls){
    try{
      await new Promise((res,rej)=>{
        const script=document.createElement("script");
        script.src=src;
        script.onload=res;
        script.onerror=()=>{script.remove();rej();};
        document.head.appendChild(script);
      });
      if(window.QRCode) return true;
    }catch(e){}
  }
  return false;
}

async function getInstagramQRDataURL(){
  const ready = await ensureQRCodeLibrary();
  if(!ready) return null;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed; left:-10000px; top:0; width:256px; height:256px; background:#fff;";
  document.body.appendChild(host);
  try{
    new QRCode(host, {text:"https://www.instagram.com/mosaboaria/", width:256, height:256, colorDark:"#000000", colorLight:"#ffffff", correctLevel:QRCode.CorrectLevel.M});
    await new Promise(r=>setTimeout(r,120));
    const canvas = host.querySelector("canvas");
    if(canvas) return canvas.toDataURL("image/png");
    const img = host.querySelector("img");
    if(img && img.src.startsWith("data:")) return img.src;
    return null;
  } finally { host.remove(); }
}

function getLabelDimensions(){
  const widthCm = Number($("label-width")?.value);
  const heightCm = Number($("label-height")?.value);
  if(!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0){
    throw new Error("Informe uma largura e uma altura válidas, maiores que zero.");
  }
  return { width: widthCm * 10, height: heightCm * 10, widthCm, heightCm };
}

function getA4Grid(labelW, labelH){
  const pageW = 210, pageH = 297;
  const marginX = 6, marginY = 6, gapX = 2, gapY = 2;
  const cols = Math.floor((pageW - 2 * marginX + gapX) / (labelW + gapX));
  const rows = Math.floor((pageH - 2 * marginY + gapY) / (labelH + gapY));
  if(cols < 1 || rows < 1) return null;
  return { cols, rows, pageW, pageH, marginX, marginY, gapX, gapY };
}

function updateDimensionSummary(){
  const width = Number($("label-width")?.value) || 6.6;
  const height = Number($("label-height")?.value) || 4.1;
  const formatted = `${width.toLocaleString("pt-BR", {maximumFractionDigits:2})} × ${height.toLocaleString("pt-BR", {maximumFractionDigits:2})} cm`;
  if($("summary-dim")) $("summary-dim").textContent = formatted;
  if($("preview-size-tag")) $("preview-size-tag").textContent = formatted;
  const preview = $("label-preview");
  if(preview) preview.style.aspectRatio = `${width} / ${height}`;
}

function drawLabel(doc, x, y, w, h, d, qrData){
  const green=[13,46,32], black=[0,0,0], gold=[185,145,70], pale=[242,246,243];
  
  // Escala proporcional em relação ao formato padrão de 66mm x 41mm
  const scaleX = w / 66.0;
  const scaleY = h / 41.0;

  const margin = 2.5 * scaleX;
  const px = x + margin;
  const py = y + margin;
  const pw = w - (margin * 2);
  const ph = h - (margin * 2);

  doc.setFillColor(255,255,255);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setDrawColor(215,195,140);
  doc.setLineWidth(0.15);
  doc.roundedRect(x + 1, y + 1, w - 2, h - 2, 1.5, 1.5, "S");

  const leftW = pw * 0.44;
  const rightX = px + leftW + 2;
  const rightW = pw - leftW - 2;

  doc.setDrawColor(...gold);
  doc.setLineWidth(0.2);
  doc.line(px + leftW + 1, py + 1.5, px + leftW + 1, py + ph - 1.5);

  let curY = py + 1.5 * scaleY;

  if(d.logoUrl){
    const logoW = Math.min(14 * scaleX, leftW * 0.75);
    const logoH = logoW * 0.65;
    const logoX = px + (leftW - logoW)/2;
    try {
      doc.addImage(d.logoUrl, "PNG", logoX, curY, logoW, logoH);
      curY += logoH + 1 * scaleY;
    } catch(e) { curY += 2 * scaleY; }
  } else {
    curY += 1.5 * scaleY;
  }

  doc.setTextColor(...green);
  doc.setFont("times", "bold");
  let titleFontSize = 9.5 * scaleY;
  doc.setFontSize(titleFontSize);
  let titleLines = doc.splitTextToSize(d.nome || "Sabonete Artesanal", leftW);
  if (titleLines.length > 2) {
    titleFontSize = 8 * scaleY;
    doc.setFontSize(titleFontSize);
    titleLines = doc.splitTextToSize(d.nome || "Sabonete Artesanal", leftW).slice(0, 2);
  }
  doc.text(titleLines, px + leftW/2, curY, { align: "center", lineHeightFactor: 1.0 });
  curY += (titleLines.length * titleFontSize * 0.38) + 1 * scaleY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.5 * scaleY);
  doc.setTextColor(...green);
  const typeText = (d.tipo || "SABONETE ARTESANAL").toUpperCase();
  const typeLines = doc.splitTextToSize(typeText, leftW);
  doc.text(typeLines, px + leftW/2, curY, { align: "center", lineHeightFactor: 1.0 });
  curY += (typeLines.length * 1.5 * scaleY) + 1 * scaleY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.8 * scaleY);
  doc.setTextColor(...black);
  const descText = d.descricao || "";
  const descLines = doc.splitTextToSize(descText, leftW);
  const lineSpacingPDF = 1.35 * scaleY;

  descLines.forEach((line) => {
    if (curY < py + ph - 6 * scaleY) {
      doc.text(line, px, curY, { align: "left", maxWidth: leftW });
      curY += lineSpacingPDF;
    }
  });
  curY += 0.8 * scaleY;

  if (d.destaque && curY < py + ph - 5 * scaleY) {
    let cleanDestaque = d.destaque.trim().replace(/^COM\s+/i, '').toUpperCase();
    doc.setFillColor(...pale);
    doc.setDrawColor(190, 210, 180);
    doc.setLineWidth(0.1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4 * scaleY); 
    doc.setTextColor(...green);
    const hlLines = doc.splitTextToSize(cleanDestaque, leftW - 1);
    const hlBoxH = (hlLines.length * 2 * scaleY) + 1.2 * scaleY;
    if (curY + hlBoxH <= py + ph - 4.5 * scaleY) {
      doc.roundedRect(px, curY, leftW, hlBoxH, 0.8, 0.8, "FD");
      doc.text(hlLines, px + leftW/2, curY + (hlBoxH / 2) + (1.2 * scaleY / 4), { align: "center", lineHeightFactor: 1.0 });
      curY += hlBoxH + 0.8 * scaleY;
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5 * scaleY);
  doc.setTextColor(...black);
  doc.text(d.peso || "100g", px + leftW/2, py + ph - 1.5 * scaleY, { align: "center" });

  let sectionsArray = [];
  if (d.composicao) sectionsArray.push({title: "Composição", text: d.composicao});
  if (d.modo) sectionsArray.push({title: "Modo de usar", text: d.modo});
  if (d.atencao) sectionsArray.push({title: "Atenção", text: d.atencao});

  let rY = py + 2 * scaleY;
  sectionsArray.forEach(sec => {
    if (rY > py + ph - 6 * scaleY) return;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.2 * scaleY);
    doc.setTextColor(...green);
    doc.text(sec.title.toUpperCase(), rightX, rY);
    
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.1);
    doc.line(rightX, rY + 0.5 * scaleY, rightX + rightW, rY + 0.5 * scaleY);
    rY += 2 * scaleY;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(3.6 * scaleY);
    doc.setTextColor(...black);
    const lines = doc.splitTextToSize(String(sec.text), rightW);
    lines.forEach((line) => {
      if (rY < py + ph - 5.5 * scaleY) {
        doc.text(line, rightX, rY, { align: "left", maxWidth: rightW });
        rY += 1.3 * scaleY;
      }
    });
    rY += 1.2 * scaleY;
  });

  const qrBoxSize = 9.5 * scaleY; 
  const qrX = rightX + rightW - qrBoxSize;
  const qrY = py + ph - qrBoxSize - 2.5 * scaleY;
  const contactW = rightW - qrBoxSize - 2 * scaleX;
  let contactY = Math.max(rY, py + ph - qrBoxSize - 2.5 * scaleY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(3.6 * scaleY);
  doc.setTextColor(...black);
  const contacts = ["(31) 9 8885-2567", "@mosaboaria", "mosaboariaartesanal@gmail.com"].filter(Boolean).join(" · ");
  if(contacts){
    const contactLines = doc.splitTextToSize(contacts, contactW);
    doc.text(contactLines, rightX, contactY, { lineHeightFactor: 1.1 });
    contactY += (contactLines.length * 1.3 * scaleY) + 0.5 * scaleY;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.2 * scaleY);
  doc.setTextColor(...black);
  const legalInfo = ["Mô Saboaria", "Contagem/MG - Brasil"].filter(Boolean).join(" · ");
  if(legalInfo){
    doc.text(doc.splitTextToSize(legalInfo, contactW), rightX, contactY);
    contactY += 1.5 * scaleY;
  }

  const datesText = [d.fabricacao ? "FAB: " + d.fabricacao : "", d.validade ? "VAL: " + d.validade : ""].filter(Boolean).join(" · ");
  if(datesText){
    doc.setFont("helvetica", "bold");
    doc.setFontSize(3.8 * scaleY);
    doc.text(datesText, rightX, contactY);
  }

  if (qrData) {
    doc.setFillColor(255, 255, 255);
    doc.rect(qrX - 0.2, qrY - 0.2, qrBoxSize + 0.4, qrBoxSize + 0.4, "F");
    doc.addImage(qrData, "PNG", qrX, qrY, qrBoxSize, qrBoxSize);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(3 * scaleY);
    doc.setTextColor(...black);
    doc.text("INSTAGRAM", qrX + (qrBoxSize / 2), qrY + qrBoxSize + 1.8 * scaleY, { align: "center" });
  }
}

async function ensurePdfLibrary(){
  if(window.jspdf && window.jspdf.jsPDF) return true;
  return false;
}

if($("generate-pdf")){
  $("generate-pdf").addEventListener("click", async () => {
    const mode = $("print-mode") ? $("print-mode").value : "single";
    let targetLabels = [];

    if(mode === "single"){
      const selectedId = $("print-select") ? $("print-select").value : "";
      const found = labels.find(x => x.id === selectedId);
      if(!found){ notify("Selecione um rótulo no campo acima."); return; }
      
      const totalPagesCount = Math.max(1, Number($("print-pages")?.value) || 1);
      const dimensions = getLabelDimensions();
      const grid = getA4Grid(dimensions.width, dimensions.height);
      if(!grid){ notify("As dimensões escolhidas não permitem encaixar nenhum rótulo em uma folha A4."); return; }
      const totalSlots = grid.cols * grid.rows * totalPagesCount;
      
      for(let i=0; i<totalSlots; i++) targetLabels.push(found);

    } else if(mode === "mixed"){
      if(labels.length === 0){ notify("Não há rótulos cadastrados no repositório."); return; }
      const totalPagesCount = Math.max(1, Number($("print-pages")?.value) || 1);
      const dimensions = getLabelDimensions();
      const grid = getA4Grid(dimensions.width, dimensions.height);
      if(!grid){ notify("As dimensões escolhidas não permitem encaixar nenhum rótulo em uma folha A4."); return; }
      const totalSlots = grid.cols * grid.rows * totalPagesCount;

      for(let i=0; i<totalSlots; i++){
        targetLabels.push(labels[i % labels.length]);
      }

    } else if(mode === "custom_batch"){
      const container = $("custom-batch-list");
      if(!container) return;
      const inputs = container.querySelectorAll(".batch-qty-input");
      let batchItems = [];
      inputs.forEach(input => {
        const id = input.dataset.id;
        const qty = parseInt(input.value) || 0;
        const itemObj = labels.find(l => l.id === id);
        if(itemObj && qty > 0){
          for(let q=0; q<qty; q++){
            batchItems.push(itemObj);
          }
        }
      });

      if(batchItems.length === 0){
        notify("Defina ao menos a quantidade de 1 rótulo na lista personalizada.");
        return;
      }
      targetLabels = batchItems;
    }

    const btn = $("generate-pdf"), oldText = btn.innerHTML;
    btn.disabled = true; btn.textContent = "Gerando PDF...";
    try {
      const ready = await ensurePdfLibrary();
      if(!ready) throw new Error("Biblioteca jsPDF indisponível.");
      
      const qrData = await getInstagramQRDataURL();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      
      const dimensions = getLabelDimensions();
      const labelW = dimensions.width;
      const labelH = dimensions.height;
      const grid = getA4Grid(labelW, labelH);
      if(!grid) throw new Error("As dimensões escolhidas são maiores que a área útil da folha A4.");
      const { pageW: W, pageH: H, marginX, marginY, gapX, gapY, cols, rows } = grid;
      const totalGridW = (cols * labelW) + ((cols - 1) * gapX);
      const totalGridH = (rows * labelH) + ((rows - 1) * gapY);
      const startX = Math.max(marginX, (W - totalGridW) / 2);
      const startY = Math.max(marginY, (H - totalGridH) / 2);

      let labelIndexCursor = 0;
      const labelsPerDocPage = cols * rows;
      const totalPagesNeeded = Math.ceil(targetLabels.length / labelsPerDocPage);

      for(let p = 0; p < totalPagesNeeded; p++){
        if(p > 0) doc.addPage("a4", "portrait");
        for(let r = 0; r < rows; r++){
          for(let c = 0; c < cols; c++){
            if(labelIndexCursor < targetLabels.length){
              const x = startX + c * (labelW + gapX);
              const y = startY + r * (labelH + gapY);
              const currentLabelToDraw = targetLabels[labelIndexCursor];
              drawLabel(doc, x, y, labelW, labelH, currentLabelToDraw, qrData);
              labelIndexCursor++;
            }
          }
        }
      }

      const filename = `mosaboaria-rotulos-${dimensions.widthCm}x${dimensions.heightCm}cm.pdf`;
      doc.save(filename);
      notify("PDF gerado e baixado com sucesso!");
    } catch(err) {
      console.error(err);
      notify(err.message || "Erro ao gerar PDF.");
    } finally {
      btn.disabled = false; btn.innerHTML = oldText;
    }
  });
}

if($("export-json")){
  $("export-json").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({app:"Mô Saboaria - Gerador de Rótulos", version:3, exportedAt:new Date().toISOString(), labels}, null, 2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "backup-mosaboaria-rotulos.json";
    a.click();
    URL.revokeObjectURL(a.href);
    notify("Backup JSON exportado!");
  });
}

if($("import-json")){
  $("import-json").addEventListener("change", async e => {
    const file = e.target.files[0];
    if(!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = Array.isArray(data) ? data : data.labels;
      if(!Array.isArray(incoming)) throw new Error("Formato inválido");
      const clean = incoming.filter(x=>x && typeof x.nome==="string").map(x=>({...x, id:uid(), createdAt:x.createdAt||new Date().toISOString()}));
      labels = [...clean, ...labels];
      persist();
      notify(`${clean.length} rótulo(s) importado(s) com sucesso!`);
    } catch(err) {
      notify("Erro ao importar arquivo JSON.");
    }
    e.target.value = "";
  });
}


["label-width", "label-height"].forEach(id => {
  if($(id)) $(id).addEventListener("input", () => {
    updateDimensionSummary();
    updatePreview();
  });
});

updateDimensionSummary();
renderRepository();
refreshPrintSelect();
renderCustomBatchList();