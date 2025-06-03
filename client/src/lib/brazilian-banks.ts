/**
 * Lista completa dos bancos brasileiros
 * Baseada nos códigos oficiais do Banco Central do Brasil
 */

export interface BrazilianBank {
  code: string;
  name: string;
  fullName: string;
}

export const BRAZILIAN_BANKS: BrazilianBank[] = [
  { code: "001", name: "Banco do Brasil", fullName: "Banco do Brasil S.A." },
  { code: "003", name: "Banco da Amazônia", fullName: "Banco da Amazônia S.A." },
  { code: "004", name: "Banco do Nordeste", fullName: "Banco do Nordeste do Brasil S.A." },
  { code: "007", name: "BNDES", fullName: "Banco Nacional de Desenvolvimento Econômico e Social" },
  { code: "033", name: "Banco Santander", fullName: "Banco Santander (Brasil) S.A." },
  { code: "036", name: "Banco BBI", fullName: "Banco BBI S.A." },
  { code: "037", name: "Banco do Estado do Pará", fullName: "Banco do Estado do Pará S.A." },
  { code: "041", name: "Banco do Estado do Rio Grande do Sul", fullName: "Banco do Estado do Rio Grande do Sul S.A." },
  { code: "047", name: "Banco do Estado de Sergipe", fullName: "Banco do Estado de Sergipe S.A." },
  { code: "070", name: "BRB", fullName: "BRB - Banco de Brasília S.A." },
  { code: "074", name: "Banco J. Safra", fullName: "Banco J. Safra S.A." },
  { code: "075", name: "Banco ABN Amro", fullName: "Banco ABN Amro S.A." },
  { code: "076", name: "Banco KDB", fullName: "Banco KDB do Brasil S.A." },
  { code: "077", name: "Banco Inter", fullName: "Banco Inter S.A." },
  { code: "082", name: "Banco Topázio", fullName: "Banco Topázio S.A." },
  { code: "084", name: "Banco Uniprime Norte do Paraná", fullName: "Uniprime Norte do Paraná - Cooperativa de Crédito Ltda." },
  { code: "085", name: "Cooperativa Central de Crédito Urbano", fullName: "Cooperativa Central de Crédito Urbano - Cecred" },
  { code: "104", name: "Caixa Econômica Federal", fullName: "Caixa Econômica Federal" },
  { code: "107", name: "Banco BBM", fullName: "Banco BBM S.A." },
  { code: "119", name: "Banco Western Union", fullName: "Banco Western Union do Brasil S.A." },
  { code: "121", name: "Banco Agibank", fullName: "Banco Agibank S.A." },
  { code: "125", name: "Brasil Plural", fullName: "Brasil Plural S.A. Banco Múltiplo" },
  { code: "129", name: "UBS Brasil", fullName: "UBS Brasil Banco de Investimento S.A." },
  { code: "132", name: "ICBC do Brasil", fullName: "ICBC do Brasil Banco Múltiplo S.A." },
  { code: "133", name: "Cresol Confederação", fullName: "Cresol Confederação - Cooperativa Central de Crédito Rural com Interação Solidária" },
  { code: "136", name: "Unicred", fullName: "Confederação Nacional das Cooperativas Centrais Unicred Ltda." },
  { code: "151", name: "Nossa Caixa", fullName: "Nossa Caixa Nosso Banco S.A." },
  { code: "184", name: "Banco Itaú BBA", fullName: "Banco Itaú BBA S.A." },
  { code: "208", name: "Banco BTG Pactual", fullName: "Banco BTG Pactual S.A." },
  { code: "212", name: "Banco Original", fullName: "Banco Original S.A." },
  { code: "213", name: "Banco Arbi", fullName: "Banco Arbi S.A." },
  { code: "217", name: "Banco John Deere", fullName: "Banco John Deere S.A." },
  { code: "218", name: "Banco BS2", fullName: "Banco BS2 S.A." },
  { code: "222", name: "Banco Credit Agricole", fullName: "Banco Credit Agricole Brasil S.A." },
  { code: "224", name: "Banco Fibra", fullName: "Banco Fibra S.A." },
  { code: "233", name: "Banco Cifra", fullName: "Banco Cifra S.A." },
  { code: "237", name: "Bradesco", fullName: "Banco Bradesco S.A." },
  { code: "241", name: "Banco Clássico", fullName: "Banco Clássico S.A." },
  { code: "243", name: "Banco Máxima", fullName: "Banco Máxima S.A." },
  { code: "246", name: "Banco ABC Brasil", fullName: "Banco ABC Brasil S.A." },
  { code: "249", name: "Banco Investcred Unibanco", fullName: "Banco Investcred Unibanco S.A." },
  { code: "250", name: "BCV", fullName: "BCV - Banco de Crédito e Varejo S.A." },
  { code: "254", name: "Paraná Banco", fullName: "Paraná Banco S.A." },
  { code: "260", name: "Nu Pagamentos", fullName: "Nu Pagamentos S.A." },
  { code: "265", name: "Banco Fator", fullName: "Banco Fator S.A." },
  { code: "266", name: "Banco Cédula", fullName: "Banco Cédula S.A." },
  { code: "270", name: "Sagitur CC", fullName: "Sagitur Corretora de Câmbio Ltda." },
  { code: "290", name: "PagBank", fullName: "PagSeguro Internet S.A." },
  { code: "300", name: "Banco de la Nación Argentina", fullName: "Banco de la Nación Argentina" },
  { code: "318", name: "Banco BMG", fullName: "Banco BMG S.A." },
  { code: "320", name: "China Construction Bank", fullName: "China Construction Bank (Brasil) Banco Múltiplo S.A." },
  { code: "341", name: "Itaú", fullName: "Itaú Unibanco S.A." },
  { code: "366", name: "Banco Societe Generale", fullName: "Banco Societe Generale Brasil S.A." },
  { code: "370", name: "Banco WestLB", fullName: "Banco WestLB do Brasil S.A." },
  { code: "376", name: "Banco J.P. Morgan", fullName: "Banco J.P. Morgan S.A." },
  { code: "389", name: "Banco Mercantil do Brasil", fullName: "Banco Mercantil do Brasil S.A." },
  { code: "394", name: "Banco Bradesco Financiamentos", fullName: "Banco Bradesco Financiamentos S.A." },
  { code: "399", name: "Kirton Bank", fullName: "Kirton Bank S.A. - Banco Múltiplo" },
  { code: "412", name: "Banco Capital", fullName: "Banco Capital S.A." },
  { code: "422", name: "Banco Safra", fullName: "Banco Safra S.A." },
  { code: "456", name: "Banco MUFG Brasil", fullName: "Banco MUFG Brasil S.A." },
  { code: "464", name: "Banco Sumitomo Mitsui Brasileiro", fullName: "Banco Sumitomo Mitsui Brasileiro S.A." },
  { code: "473", name: "Banco Caixa Geral", fullName: "Banco Caixa Geral - Brasil S.A." },
  { code: "477", name: "Citibank", fullName: "Citibank N.A." },
  { code: "479", name: "Banco ItauBank", fullName: "Banco ItauBank S.A." },
  { code: "487", name: "Deutsche Bank", fullName: "Deutsche Bank S.A. - Banco Alemão" },
  { code: "488", name: "JPMorgan Chase Bank", fullName: "JPMorgan Chase Bank, National Association" },
  { code: "492", name: "ING Bank", fullName: "ING Bank N.V." },
  { code: "495", name: "Banco de La Provincia de Buenos Aires", fullName: "Banco de La Provincia de Buenos Aires" },
  { code: "505", name: "Banco Credit Suisse", fullName: "Banco Credit Suisse (Brasil) S.A." },
  { code: "545", name: "Senso", fullName: "Senso Corretora de Câmbio e Valores Mobiliários S.A." },
  { code: "600", name: "Banco Luso Brasileiro", fullName: "Banco Luso Brasileiro S.A." },
  { code: "604", name: "Banco Industrial do Brasil", fullName: "Banco Industrial do Brasil S.A." },
  { code: "610", name: "Banco VR", fullName: "Banco VR S.A." },
  { code: "611", name: "Banco Paulista", fullName: "Banco Paulista S.A." },
  { code: "612", name: "Banco Guanabara", fullName: "Banco Guanabara S.A." },
  { code: "613", name: "Omni Banco", fullName: "Omni Banco S.A." },
  { code: "623", name: "Banco Pan", fullName: "Banco Pan S.A." },
  { code: "626", name: "Banco Ficsa", fullName: "Banco Ficsa S.A." },
  { code: "630", name: "Banco Intercap", fullName: "Banco Intercap S.A." },
  { code: "633", name: "Banco Rendimento", fullName: "Banco Rendimento S.A." },
  { code: "634", name: "Banco Triângulo", fullName: "Banco Triângulo S.A." },
  { code: "637", name: "Banco Sofisa", fullName: "Banco Sofisa S.A." },
  { code: "643", name: "Banco Pine", fullName: "Banco Pine S.A." },
  { code: "652", name: "Itaú Unibanco Holding", fullName: "Itaú Unibanco Holding S.A." },
  { code: "653", name: "Banco Indusval", fullName: "Banco Indusval S.A." },
  { code: "654", name: "Banco A.J. Renner", fullName: "Banco A.J. Renner S.A." },
  { code: "655", name: "Banco Votorantim", fullName: "Banco Votorantim S.A." },
  { code: "707", name: "Banco Daycoval", fullName: "Banco Daycoval S.A." },
  { code: "712", name: "Banco Ourinvest", fullName: "Banco Ourinvest S.A." },
  { code: "739", name: "Banco Cetelem", fullName: "Banco Cetelem S.A." },
  { code: "741", name: "Banco Ribeirão Preto", fullName: "Banco Ribeirão Preto S.A." },
  { code: "743", name: "Banco Semear", fullName: "Banco Semear S.A." },
  { code: "745", name: "Banco Citibank", fullName: "Banco Citibank S.A." },
  { code: "746", name: "Banco Modal", fullName: "Banco Modal S.A." },
  { code: "747", name: "Banco Rabobank", fullName: "Banco Rabobank International Brasil S.A." },
  { code: "748", name: "Banco Cooperativo Sicredi", fullName: "Banco Cooperativo Sicredi S.A." },
  { code: "751", name: "Scotiabank Brasil", fullName: "Scotiabank Brasil S.A. Banco Múltiplo" },
  { code: "752", name: "Banco BNP Paribas", fullName: "Banco BNP Paribas Brasil S.A." },
  { code: "753", name: "Novo Banco Continental", fullName: "Novo Banco Continental S.A. - Banco Múltiplo" },
  { code: "755", name: "Bank of America", fullName: "Bank of America Merrill Lynch Banco Múltiplo S.A." },
  { code: "756", name: "Sicoob", fullName: "Banco Cooperativo do Brasil S.A. - Bancoob" },
];

/**
 * Retorna a lista de bancos ordenada alfabeticamente
 */
export function getBanksOrderedByName(): BrazilianBank[] {
  return [...BRAZILIAN_BANKS].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Busca um banco pelo código
 */
export function getBankByCode(code: string): BrazilianBank | undefined {
  return BRAZILIAN_BANKS.find(bank => bank.code === code);
}

/**
 * Busca bancos pelo nome (busca parcial, case-insensitive)
 */
export function searchBanksByName(searchTerm: string): BrazilianBank[] {
  const term = searchTerm.toLowerCase().trim();
  if (!term) return getBanksOrderedByName();
  
  return BRAZILIAN_BANKS.filter(bank => 
    bank.name.toLowerCase().includes(term) || 
    bank.fullName.toLowerCase().includes(term)
  ).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}