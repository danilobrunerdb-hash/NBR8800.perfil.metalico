/**
 * calculator.js - Serviço Backend para Cálculos Estruturais (NBR 8800)
 * Responsabilidade: Isolar a lógica matemática da camada de transporte (HTTP).
 * Recebe as propriedades do perfil e os esforços, retornando o aproveitamento.
 */

function calculateProfile(profile, loads, material) {
  const Mxsd = parseFloat(loads.Mxsd) || 0;
  const Mysd = parseFloat(loads.Mysd) || 0;
  const Vxsd = parseFloat(loads.Vxsd) || 0;
  const Vysd = parseFloat(loads.Vysd) || 0;
  const Nsd = parseFloat(loads.Nsd) || 0;
  const Lb = parseFloat(loads.Lb) || 160;
  const Lx = parseFloat(loads.Lx) || Lb;
  const Ly = parseFloat(loads.Ly) || Lb;

  // Extração das propriedades do aço recebidas do Frontend
  const fy = material.fy;
  const E = material.E;
  const gamma_a1 = material.gamma_a1;
  const Kv = material.Kv;

  // Extração das propriedades geométricas do perfil selecionado na base JSON
  const {
    d, bf, tw, tf, h, d_linha, Area,
    Ix, Wx, rx, Zx,
    Iy, Wy, ry, Zy,
    It, Cw
  } = profile;

  const realCw = Cw; 
  const results = {};

  // ---------------------------------------------------------------------------
  // 1. Zx e Zy mín requerido
  // Transforma Mxsd/Mysd de kN.m para kN.cm multiplicando por 100.
  // ---------------------------------------------------------------------------
  const Zx_min = (Mxsd * 100 * gamma_a1) / (fy / 10);
  results.Zx_min = Zx_min;
  
  const Zy_min = (Mysd * 100 * gamma_a1) / (fy / 10);
  results.Zy_min = Zy_min;

  // ---------------------------------------------------------------------------
  // 2. CAPACIDADE RELATIVA AO MOMENTO (Mrd_max)
  // Limita o momento fletor resistente ao escoamento da seção.
  // ---------------------------------------------------------------------------
  const Mrd_max_cm = (1.5 * Wx * (fy / 10)) / gamma_a1;
  const Mrd_max = Mrd_max_cm / 100; // Converte de kN.cm para kN.m
  results.Mrd_max_cm = Mrd_max_cm;
  results.Mrd_max = Mrd_max;

  // ---------------------------------------------------------------------------
  // 3. CLASSIFICAÇÃO DO PERFIL (Anexo D - NBR 8800)
  // Verifica se a alma do perfil é considerada esbelta.
  // ---------------------------------------------------------------------------
  const class_lambda = d_linha / tw;
  const class_lambda_r = 5.7 * Math.sqrt(E / fy);
  const esbelto = class_lambda <= class_lambda_r ? 'Não' : 'Sim';
  results.Classificacao = {
    lambda: class_lambda,
    lambda_r: class_lambda_r,
    esbelto
  };

  // ---------------------------------------------------------------------------
  // 4.1 FLAMBAGEM LATERAL COM TORÇÃO (FLT)
  // Fenômeno de instabilidade global onde a viga torce e flamba lateralmente.
  // ---------------------------------------------------------------------------
  const beta1 = ((0.7 * fy) * Wx) / (E * It);
  const Cb = 1; // Coeficiente de modificação para diagrama de momento fletor não uniforme
  const Mpl_FLT_cm = (fy / 10) * Zx;
  const Mr_FLT_cm = 0.7 * (fy / 10) * Wx;
  const lambda_FLT = Lb / ry;
  const lambda_p_FLT = 1.76 * Math.sqrt(E / fy);
  
  const termo_raiz_FLT = 1 + Math.sqrt(1 + (27 * realCw * Math.pow(beta1, 2)) / (Math.pow(Cb, 2) * Iy));
  const lambda_r_FLT = ((1.38 * Cb * Math.sqrt(Iy * It)) / (ry * It * beta1)) * Math.sqrt(termo_raiz_FLT);
  const Mrc_cm = (Cb * Math.pow(Math.PI, 2) * (E / 10) * Iy / Math.pow(Lb, 2)) * Math.sqrt((realCw / Iy) * (1 + 0.039 * (It * Math.pow(Lb, 2)) / realCw));

  let Mrd_FLT_cm = 0;
  if (lambda_FLT <= lambda_p_FLT) {
    Mrd_FLT_cm = Mpl_FLT_cm / gamma_a1; // Regime Plástico
  } else if (lambda_FLT > lambda_p_FLT && lambda_FLT <= lambda_r_FLT) {
    Mrd_FLT_cm = (1 / gamma_a1) * (Mpl_FLT_cm - (Mpl_FLT_cm - Mr_FLT_cm) * ((lambda_FLT - lambda_p_FLT) / (lambda_r_FLT - lambda_p_FLT))); // Regime Inelástico
  } else {
    Mrd_FLT_cm = Mrc_cm / gamma_a1; // Regime Elástico
  }
  
  let Mrd_FLT = Mrd_FLT_cm / 100;
  if (Mrd_FLT > Mrd_max) Mrd_FLT = Mrd_max; // Limitador

  results.FLT = {
    beta1, Cb, Mpl: Mpl_FLT_cm, Mr: Mr_FLT_cm, Mrc: Mrc_cm,
    lambda: lambda_FLT, lambda_p: lambda_p_FLT, lambda_r: lambda_r_FLT,
    Mrd: Mrd_FLT,
    pass: Mrd_FLT >= Mxsd // true se resistir ao esforço solicitante
  };

  // ---------------------------------------------------------------------------
  // 4.2 FLAMBAGEM LATERAL DA MESA (FLM)
  // Instabilidade local da mesa comprimida.
  // ---------------------------------------------------------------------------
  const Mpl_FLM_cm = (fy / 10) * Zx;
  const Mr_FLM_cm = 0.7 * (fy / 10) * Wx;
  const lambda_FLM = (bf / 2) / tf;
  const lambda_p_FLM = 0.38 * Math.sqrt(E / fy);
  const lambda_r_FLM = 0.83 * Math.sqrt(E / (0.7 * fy));

  const Mcr_FLM_cm = ((0.69 * (E / 10)) / Math.pow(lambda_FLM, 2)) * Wx;

  let Mrd_FLM_cm = 0;
  if (lambda_FLM <= lambda_p_FLM) {
    Mrd_FLM_cm = Mpl_FLM_cm / gamma_a1;
  } else if (lambda_FLM > lambda_p_FLM && lambda_FLM <= lambda_r_FLM) {
    Mrd_FLM_cm = (1 / gamma_a1) * (Mpl_FLM_cm - (Mpl_FLM_cm - Mr_FLM_cm) * ((lambda_FLM - lambda_p_FLM) / (lambda_r_FLM - lambda_p_FLM)));
  } else {
    Mrd_FLM_cm = Mcr_FLM_cm / gamma_a1;
  }
  
  let Mrd_FLM = Mrd_FLM_cm / 100;
  if (Mrd_FLM > Mrd_max) Mrd_FLM = Mrd_max;

  results.FLM = {
    Mcr: Mcr_FLM_cm, Mpl: Mpl_FLM_cm, Mr: Mr_FLM_cm,
    lambda: lambda_FLM, lambda_p: lambda_p_FLM, lambda_r: lambda_r_FLM,
    Mrd: Mrd_FLM,
    pass: Mrd_FLM >= Mxsd
  };

  // ---------------------------------------------------------------------------
  // 4.3 FLAMBAGEM LATERAL DA ALMA (FLA)
  // Instabilidade local da alma comprimida por flexão.
  // ---------------------------------------------------------------------------
  const Mpl_FLA_cm = (fy / 10) * Zx;
  const Mr_FLA_cm = (fy / 10) * Wx; 
  const lambda_FLA = d_linha / tw;
  const lambda_p_FLA = 3.76 * Math.sqrt(E / fy);
  const lambda_r_FLA = 5.70 * Math.sqrt(E / fy);

  let Mrd_FLA_cm = 0;
  if (lambda_FLA <= lambda_p_FLA) {
    Mrd_FLA_cm = Mpl_FLA_cm / gamma_a1;
  } else if (lambda_FLA > lambda_p_FLA && lambda_FLA <= lambda_r_FLA) {
    Mrd_FLA_cm = (1 / gamma_a1) * (Mpl_FLA_cm - (Mpl_FLA_cm - Mr_FLA_cm) * ((lambda_FLA - lambda_p_FLA) / (lambda_r_FLA - lambda_p_FLA)));
  } else {
    Mrd_FLA_cm = 0; // Alma excessivamente esbelta (requer outro tratamento normativo não coberto aqui)
  }
  
  let Mrd_FLA = Mrd_FLA_cm / 100;
  if (Mrd_FLA > Mrd_max && Mrd_FLA !== 0) Mrd_FLA = Mrd_max;

  results.FLA = {
    Mpl: Mpl_FLA_cm, Mr: Mr_FLA_cm,
    lambda: lambda_FLA, lambda_p: lambda_p_FLA, lambda_r: lambda_r_FLA,
    Mrd: Mrd_FLA,
    pass: Mrd_FLA >= Mxsd
  };

  // ---------------------------------------------------------------------------
  // 5. CÁLCULO DE RESISTÊNCIA AO CISALHAMENTO (Vy)
  // Esforço cortante na alma do perfil.
  // ---------------------------------------------------------------------------
  const Aw = d * tw;
  const Vpl = 0.6 * Aw * (fy / 10);
  const lambda_V = d_linha / tw;
  const lambda_p_V = 1.1 * Math.sqrt((Kv * E) / fy);
  const lambda_r_V = 1.37 * Math.sqrt((Kv * E) / fy);

  let Vrd = 0;
  if (lambda_V <= lambda_p_V) {
    Vrd = Vpl / gamma_a1;
  } else if (lambda_V > lambda_p_V && lambda_V <= lambda_r_V) {
    Vrd = (lambda_p_V / lambda_V) * (Vpl / gamma_a1);
  } else {
    Vrd = 1.24 * Math.pow(lambda_p_V / lambda_V, 2) * (Vpl / gamma_a1);
  }

  results.Shear = {
    Aw, Vpl, Kv,
    lambda: lambda_V, lambda_p: lambda_p_V, lambda_r: lambda_r_V,
    Vrd: Vrd,
    pass: Vrd >= Vysd
  };

  // ---------------------------------------------------------------------------
  // 5.2 CÁLCULO DE RESISTÊNCIA AO CISALHAMENTO X (Vx)
  // Esforço cortante atuando nas mesas do perfil.
  // ---------------------------------------------------------------------------
  const Aw_x = 2 * bf * tf;
  const Vpl_x = 0.6 * Aw_x * (fy / 10);
  const lambda_Vx = (bf/2) / tf; 
  const lambda_p_Vx = 1.1 * Math.sqrt((1.2 * E) / fy);
  const lambda_r_Vx = 1.37 * Math.sqrt((1.2 * E) / fy);

  let Vrd_x = 0;
  if (lambda_Vx <= lambda_p_Vx) {
    Vrd_x = Vpl_x / gamma_a1;
  } else if (lambda_Vx > lambda_p_Vx && lambda_Vx <= lambda_r_Vx) {
    Vrd_x = (lambda_p_Vx / lambda_Vx) * (Vpl_x / gamma_a1);
  } else {
    Vrd_x = 1.24 * Math.pow(lambda_p_Vx / lambda_Vx, 2) * (Vpl_x / gamma_a1);
  }

  results.ShearX = {
    Vrd: Vrd_x,
    pass: Vrd_x >= Vxsd
  };

  // ---------------------------------------------------------------------------
  // 5.3 FLAMBAGEM DA MESA EIXO Y (FLM-Y) E ESCOAMENTO
  // Flexão no eixo fraco.
  // ---------------------------------------------------------------------------
  const Mpl_y_cm = (fy / 10) * Zy;
  const Mr_y_cm = 0.7 * (fy / 10) * Wy;
  const Mcr_FLMy_cm = ((0.69 * (E / 10)) / Math.pow(lambda_FLM, 2)) * Wy;
  let Mrd_y_cm = 0;
  if (lambda_FLM <= lambda_p_FLM) {
    Mrd_y_cm = Mpl_y_cm / gamma_a1;
  } else if (lambda_FLM > lambda_p_FLM && lambda_FLM <= lambda_r_FLM) {
    Mrd_y_cm = (1 / gamma_a1) * (Mpl_y_cm - (Mpl_y_cm - Mr_y_cm) * ((lambda_FLM - lambda_p_FLM) / (lambda_r_FLM - lambda_p_FLM)));
  } else {
    Mrd_y_cm = Mcr_FLMy_cm / gamma_a1;
  }
  
  const Mrd_y_max = (1.5 * Wy * (fy / 10)) / gamma_a1;
  if (Mrd_y_cm > Mrd_y_max) Mrd_y_cm = Mrd_y_max;
  
  const Mrd_y = Mrd_y_cm / 100;

  results.BendingY = {
    Mrd: Mrd_y,
    pass: Mrd_y >= Mysd
  };

  // ---------------------------------------------------------------------------
  // 6. RESISTÊNCIA À TRAÇÃO (ITEM 5.2.2)
  // ---------------------------------------------------------------------------
  // NtRd = Ag * fy / 1.1. Na nossa base 'Area' é Ag. (cm²) -> kN
  const NtRd = (Area * fy) / gamma_a1;
  const isTension = Nsd > 0;

  results.Tension = {
    NtRd,
    pass: isTension ? (NtRd >= Math.abs(Nsd)) : true
  };

  // ---------------------------------------------------------------------------
  // 7. RESISTÊNCIA À COMPRESSÃO (ITEM 5.3)
  // ---------------------------------------------------------------------------
  // 7.1 Flambagem Global
  const G_val = 7700; // Constante G (kN/cm²) para aço conforme padrão
  
  const Nex = (Math.pow(Math.PI, 2) * E * Ix) / Math.pow(Lx, 2);
  const Ney = (Math.pow(Math.PI, 2) * E * Iy) / Math.pow(Ly, 2);
  const r0_squared = Math.pow(rx, 2) + Math.pow(ry, 2);
  const Lz = Ly; // Lz usualmente é tomado igual ao Ly se não informado
  const Nez = ((Math.pow(Math.PI, 2) * E * realCw) / Math.pow(Lz, 2) + G_val * It) / r0_squared;
  
  const Ne = Math.min(Nex, Ney, Nez);
  const lambda0 = Math.sqrt((Area * fy) / Ne);
  
  let chi = 1;
  if (lambda0 <= 1.5) {
    chi = Math.pow(0.658, Math.pow(lambda0, 2));
  } else {
    chi = 0.877 / Math.pow(lambda0, 2);
  }

  // 7.2 Flambagem Local (Aef)
  // Elemento AL (Mesa)
  const b_AL = bf / 2;
  const t_AL = tf;
  const bt_AL = b_AL / t_AL;
  const bt_lim_AL = 0.56 * Math.sqrt(E / fy);
  const c1_AL = 0.22;
  const c2_AL = 1.49;
  const sigma_el_AL = Math.pow(c2_AL * (bt_lim_AL / bt_AL), 2) * fy;
  const lambda_AL = bt_lim_AL / Math.sqrt(chi);
  
  let bef_AL = b_AL;
  if (bt_AL > lambda_AL || bt_AL > bt_lim_AL) { // Se for maior que ambos
    bef_AL = b_AL * (1 - c1_AL * Math.sqrt(sigma_el_AL / (chi * fy))) * Math.sqrt(sigma_el_AL / (chi * fy));
    if (bef_AL > b_AL) bef_AL = b_AL;
  }

  // Elemento AA (Alma)
  const b_AA = d_linha;
  const t_AA = tw;
  const bt_AA = b_AA / t_AA;
  const bt_lim_AA = 1.49 * Math.sqrt(E / fy);
  const c1_AA = 0.18;
  const c2_AA = 1.31;
  const sigma_el_AA = Math.pow(c2_AA * (bt_lim_AA / bt_AA), 2) * fy;
  const lambda_AA = bt_lim_AA / Math.sqrt(chi);
  
  let bef_AA = b_AA;
  if (bt_AA > lambda_AA || bt_AA > bt_lim_AA) {
    bef_AA = b_AA * (1 - c1_AA * Math.sqrt(sigma_el_AA / (chi * fy))) * Math.sqrt(sigma_el_AA / (chi * fy));
    if (bef_AA > b_AA) bef_AA = b_AA;
  }

  let Aef = Area - (4 * Math.max(0, b_AL - bef_AL) * t_AL + Math.max(0, b_AA - bef_AA) * t_AA);
  if (Aef > Area) Aef = Area;

  const NcRd = (chi * Aef * fy) / gamma_a1;
  const isCompression = Nsd < 0;

  results.Compression = {
    Nex, Ney, Nez, Ne, lambda0, chi, r0_squared,
    AL: { b: b_AL, t: t_AL, bt: bt_AL, bt_lim: bt_lim_AL, c1: c1_AL, c2: c2_AL, sigma_el: sigma_el_AL, lambda_lim: lambda_AL, bef: bef_AL },
    AA: { b: b_AA, t: t_AA, bt: bt_AA, bt_lim: bt_lim_AA, c1: c1_AA, c2: c2_AA, sigma_el: sigma_el_AA, lambda_lim: lambda_AA, bef: bef_AA },
    Aef, NcRd,
    pass: isCompression ? (NcRd >= Math.abs(Nsd)) : true
  };

  // ---------------------------------------------------------------------------
  // 8. ESFORÇOS COMBINADOS
  // ---------------------------------------------------------------------------
  let combinedRatio = 0;
  const Mrdx = Math.min(Mrd_FLT, Mrd_FLM, Mrd_FLA || Infinity);
  const Mrdy = Mrd_y;
  
  const M_ratio = (Mxsd / Mrdx) + (Mysd / Mrdy);

  if (isTension) {
    combinedRatio = (Nsd / NtRd) + M_ratio;
  } else if (isCompression) {
    const Ncsd = Math.abs(Nsd);
    if ((Ncsd / NcRd) >= 0.2) {
      combinedRatio = (Ncsd / NcRd) + (8 / 9) * M_ratio;
    } else {
      combinedRatio = (Ncsd / (2 * NcRd)) + M_ratio;
    }
  } else {
    combinedRatio = M_ratio;
  }

  results.Combined = {
    ratio: combinedRatio,
    pass: combinedRatio <= 1.0
  };

  // Avaliação Final
  results.min_Mrd = Mrdx;
  results.overallPass = results.FLT.pass && results.FLM.pass && results.FLA.pass && results.BendingY.pass && results.Shear.pass && results.ShearX.pass && results.Tension.pass && results.Compression.pass && results.Combined.pass;

  return results;
}

module.exports = { calculateProfile };
