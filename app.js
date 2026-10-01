const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const week=["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const days=$("#days"), print=$("#printArea");
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const v=e=>(e?.value||"").trim();
const dateObj=s=>{let [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
const brDate=s=>{if(!s)return "";let [y,m,d]=s.split("-");return `${d}/${m}/${y}`};\nconst STORAGE_KEY="relatorio-escolar-rascunho-v1";

function setDraftStatus(text){
 const el=$("#draftStatus");
 if(el)el.textContent=text;
}

function collectDraft(){
 const fields=["aluno","cuidador","dataInicio","dataFim","responsavel","idade","diagnostico","obsAlimentacao","quaisMedicacao","nascimento","turno"];
 const data={version:1,savedAt:new Date().toISOString(),fields:{}};
 fields.forEach(id=>{const el=$("#"+id);if(el)data.fields[id]=el.value});
 data.alimentacao=document.querySelector('input[name="alimentacao"]:checked')?.value||"VO";
 data.medicacao=document.querySelector('input[name="medicacao"]:checked')?.value||"NAO";
 data.days=$(".day").map(day=>({
   date:day.dataset.date||"",
   status:day.querySelector(".status")?.value||"presente",
   recebido:day.querySelector(".recebido")?.value||"",
   recebidoOutro:day.querySelector(".recebidoOutro")?.value||"",
   destino:day.querySelector(".destino")?.value||"",
   entrega:day.querySelector(".entrega")?.value||"",
   entregaOutro:day.querySelector(".entregaOutro")?.value||"",
   activities:[...day.querySelectorAll(".act:checked")].map(x=>x.value),
   obs:day.querySelector(".obs")?.value||"",
   specialText:day.querySelector(".specialText")?.value||""
 }));
 return data;
}

function saveDraft(showMessage=true){
 try{
   localStorage.setItem(STORAGE_KEY,JSON.stringify(collectDraft()));
   if(showMessage)setDraftStatus("Rascunho salvo ✓");
 }catch(err){
   console.error(err);
   setDraftStatus("Não foi possível salvar neste navegador.");
 }
}

function restoreDraft(){
 try{
   const raw=localStorage.getItem(STORAGE_KEY);
   if(!raw)return;
   const data=JSON.parse(raw);
   Object.entries(data.fields||{}).forEach(([id,value])=>{
     const el=$("#"+id); if(el)el.value=value??"";
   });
   const ali=document.querySelector(`input[name="alimentacao"][value="${data.alimentacao||"VO"}"]`);
   const med=document.querySelector(`input[name="medicacao"][value="${data.medicacao||"NAO"}"]`);
   if(ali)ali.checked=true;
   if(med)med.checked=true;

   if(data.fields?.dataInicio && data.fields?.dataFim){
     createDays();
     const savedByDate=new Map((data.days||[]).map(d=>[d.date,d]));
     $(".day").forEach(day=>{
       const saved=savedByDate.get(day.dataset.date);
       if(!saved)return;
       const set=(selector,value)=>{const el=day.querySelector(selector);if(el&&value!=null)el.value=value};
       set(".status",saved.status||"presente");
       set(".recebido",saved.recebido||"");
       set(".recebidoOutro",saved.recebidoOutro||"");
       set(".destino",saved.destino||"");
       set(".entrega",saved.entrega||"");
       set(".entregaOutro",saved.entregaOutro||"");
       set(".obs",saved.obs||"");
       set(".specialText",saved.specialText||"");
       day.querySelectorAll(".act").forEach(ch=>ch.checked=(saved.activities||[]).includes(ch.value));
       day.dataset.status=saved.status||"presente";
     });
     render();
   }
   const when=data.savedAt?new Date(data.savedAt):null;
   setDraftStatus(when&&!isNaN(when)?`Rascunho recuperado · ${when.toLocaleString("pt-BR")}`:"Rascunho recuperado");
 }catch(err){
   console.error(err);
   setDraftStatus("Não foi possível recuperar o rascunho.");
 }
}

function createDays(){
 const a=$("#dataInicio").value,b=$("#dataFim").value;
 if(!a||!b)return alert("Informe a data inicial e a data final.");
 let x=dateObj(a),end=dateObj(b); if(x>end)return alert("A data inicial deve ser anterior à final.");
 days.innerHTML="";
 for(let d=new Date(x);d<=end;d.setDate(d.getDate()+1)){
   const f=$("#dayTemplate").content.cloneNode(true), el=f.querySelector(".day");
   const iso=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
   el.dataset.date=iso; f.querySelector(".date").textContent=brDate(iso); f.querySelector(".weekday").textContent=week[d.getDay()];
   if(d.getDay()===0||d.getDay()===6)f.querySelector(".status").value="fimdesemana";
   days.appendChild(f);
 }
 $$(".status").forEach(s=>{s.addEventListener("change",()=>{s.closest(".day").dataset.status=s.value;render()});s.closest(".day").dataset.status=s.value});
 $("#daysEmpty").style.display="none";render();
}

function sentence(el){
 const name=v($("#aluno"))||"O aluno", status=el.querySelector(".status").value;
 if(status==="ausente")return `${name} não compareceu a escola.`;
 if(status==="feriado")return "Feriado.";
 if(status==="liberada")return "Liberada pelos gestores.";
 if(status==="fimdesemana")return "";
 if(status==="outro")return v(el.querySelector(".specialText"));
 const rec=v(el.querySelector(".recebido"))==="outro"?v(el.querySelector(".recebidoOutro")):v(el.querySelector(".recebido"));
 const dest=v(el.querySelector(".destino")), ent=v(el.querySelector(".entrega"))==="outro"?v(el.querySelector(".entregaOutro")):v(el.querySelector(".entrega"));
 const a=[...el.querySelectorAll(".act:checked")].map(x=>x.value);
 let parts=[];
 if(rec)parts.push(`Recebi ${name} de ${rec}`);
 if(dest)parts.push(`foi entregue ${dest}`);
 if(a.includes("banheiro"))parts.push("levei ao banheiro");
 if(a.includes("higiene"))parts.push("auxiliei na higiene das mãos");
 if(a.includes("lanche"))parts.push("no intervalo servi o lanche");
 if(a.includes("agua"))parts.push("e água");
 if(a.includes("garrafa"))parts.push("enchi a garrafa");
 if(a.includes("sala"))parts.push("conduzi de volta a sala de aula");
 if(v(el.querySelector(".obs")))parts.push(v(el.querySelector(".obs")));
 if(ent)parts.push(`e no final do turno foi entregue a ${ent}`);
 if(!parts.length)return "Sem registro informado.";
 let t=parts[0];
 for(let i=1;i<parts.length;i++)t += (parts[i].startsWith("no intervalo")||parts[i]==="e água"||parts[i].startsWith("e no final")) ? `, ${parts[i]}` : `, ${parts[i]}`;
 return t.replace(/\s+/g," ").replace(/\.\s*$/,"")+".";
}

function entryHTML(el){
 const d=el.dataset.date, day=dateObj(d), st=el.querySelector(".status").value;
 const red=(day.getDay()===0||day.getDay()===6||st==="feriado"||st==="liberada");
 let text=sentence(el);
 if(st==="fimdesemana")text=week[day.getDay()];
 return `<div class="entry ${red?"weekend":""}">${brDate(d)}: ${week[day.getDay()]}${text?`: ${esc(text)}`:""}</div>`;
}

function headerHTML(){
 const aluno=v($("#aluno")),cu=v($("#cuidador")),resp=v($("#responsavel")),idade=v($("#idade")),diag=v($("#diagnostico"));
 const ali=document.querySelector('input[name="alimentacao"]:checked')?.value||"VO", med=document.querySelector('input[name="medicacao"]:checked')?.value||"NAO";
 const nasc=brDate($("#nascimento").value), turno=v($("#turno")), inicio=brDate($("#dataInicio").value),fim=brDate($("#dataFim").value);
 return `<div class="model-head"><img class="model-logo" src="logo.png"><div class="company">CLAREAR COM E SERV DE MÃO DE OBRA</div><div class="address">Endereço: AV. Nascimento de Castro, nº1734 – Natal/RN<br>Bairro: Lagoa Nova, Cep: 59056-450<br>CNPJ: 02.567.270/0001-04</div></div>
 <table class="header-table">
 <tr><td class="label">ALUNO(A)</td><td colspan="3">${esc(aluno)}</td></tr>
 <tr><td class="label">CUIDADOR(A)</td><td colspan="3">${esc(cu)}</td></tr>
 <tr><td class="label">SEMANA</td><td colspan="3">${esc(inicio)} A ${esc(fim)}.</td></tr>
 <tr><td colspan="2" class="bold">RESPONSÁVEL: ${esc(resp)}</td><td colspan="2" class="bold">IDADE: anos${esc(idade)}</td></tr>
 <tr><td colspan="2" class="diag"><b>DIAGNÓSTICO:</b> ${esc(diag)}</td><td colspan="2" class="obs"><b>ALIMENTAÇÃO:</b> ( ${ali==="VO"?"X":" "} ) V.O ( ${ali==="DIETA"?"X":" "} ) DIETA<br><br><b>OBS:</b> ${esc(v($("#obsAlimentacao")))}</td></tr>
 <tr><td colspan="1" class="bold">MEDICAÇÃO: ( ${med==="SIM"?"X":" "} ) SIM<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;( ${med==="NAO"?"X":" "} ) NÃO</td><td colspan="3" class="bold">QUAIS: ${esc(v($("#quaisMedicacao")))}<br>Data de Nascimento: ${esc(nasc)}</td></tr>
 <tr><td colspan="4" class="turno">TURNO: ( ${turno==="MATUTINO"?"X":" "} ) MATUTINO ( ${turno==="VESPERTINO"?"X":" "} ) VESPERTINO ( ${turno==="NOTURNO"?"X":" "} ) NOTURNO ( ${turno==="INTEGRAL"?"X":" "} ) INTEGRAL ( ${turno==="TÉCNICO"?"X":" "} ) TÉCNICO</td></tr>
 </table>`;
}

function makePage(cls,body){return `<div class="pdf-page ${cls||""}">${body}</div>`}

function render(){
 if(!$$(".day").length)return;
 const entries=$$(".day").map(entryHTML);
 // First page: header + report area. We use the original document's approximate
 // available writing height and then continue on page 2.
 const firstLimit=10;
 const first=entries.slice(0,firstLimit), rest=entries.slice(firstLimit);
 let out=makePage("",`${headerHTML()}<div class="report-title">RELATÓRIO SEMANAL</div><div class="report-subtitle"></div><div class="report-box">${first.join("")}</div>`);
 if(rest.length) out+=makePage("continuation",`<div class="report-box">${rest.join("")}</div>`);
 // The supplied original has a separate signature page.
 out+=makePage("signature-page",`<div class="signature-box"></div><div class="page-number">14</div><div class="signature-line">Assinatura do cuidador(a)</div>`);
 print.innerHTML=out;
}
$("#createDays").onclick=()=>{createDays();saveDraft()};
$("#saveBtn").onclick=()=>saveDraft();
$("#previewBtn").onclick=render;
$("#pdfBtn").onclick=()=>{saveDraft(false);render();setTimeout(()=>window.print(),150)};
$("#clearBtn").onclick=()=>{
 if(confirm("Limpar o formulário e apagar o rascunho salvo neste navegador?")){
   localStorage.removeItem(STORAGE_KEY);
   location.reload();
 }
};

let saveTimer;
function scheduleAutoSave(){
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>saveDraft(false),350);
}
document.addEventListener("input",e=>{
 if(e.target.closest(".card")){render();scheduleAutoSave()}
});
document.addEventListener("change",e=>{
 if(e.target.closest(".card")){render();scheduleAutoSave()}
});
window.addEventListener("beforeunload",()=>saveDraft(false));
restoreDraft();

$("#fillExample").onclick=()=>{
 $("#aluno").value="Gabriel Victor dos Santos Soares";$("#cuidador").value="Rosenilda de Almeida dos Santos";
 $("#responsavel").value="Joseane Santos Soares e Sousa";$("#idade").value="18";
 $("#dataInicio").value="2026-08-26";$("#dataFim").value="2026-09-30";
 $("#diagnostico").value="Hipótese di agnóstica, tem histórico de atraso neuropsicomotor ,mas sem investigação etimológica.";
 $("#nascimento").value="2007-08-11";$("#turno").value="VESPERTINO";createDays();
 const ds=$$(".day");
 const statuses=["presente","ausente","ausente","fimdesemana","fimdesemana","presente","ausente","presente","presente","ausente"];
 ds.forEach((d,i)=>{if(statuses[i]){d.querySelector(".status").value=statuses[i];d.dataset.status=statuses[i]}});
 ds[0].querySelector(".recebido").value="sua avó";ds[0].querySelector(".destino").value="a professora";["banheiro","lanche","agua"].forEach(x=>dCheck(ds[0],x));ds[0].querySelector(".entrega").value="sua avó";
 ds[5].querySelector(".recebido").value="sua tia";dCheck(ds[5],"sala");dCheck(ds[5],"banheiro");dCheck(ds[5],"lanche");dCheck(ds[5],"agua");ds[5].querySelector(".entrega").value="sua tia";
 render();
};
function dCheck(d,v){let x=d.querySelector(`.act[value="${v}"]`);if(x)x.checked=true}
