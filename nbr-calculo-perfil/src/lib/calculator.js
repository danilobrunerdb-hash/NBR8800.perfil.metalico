/**
 * calculator.js - Módulo de Cálculos Estruturais (NBR 8800)
 * Responsabilidade: Executar toda a matemática de verificação dos perfis metálicos
 * diretamente no navegador do usuário (Front-end), garantindo performance e
 * permitindo a hospedagem 100% gratuita no Vercel (arquivos estáticos).
 *
 * Todas as equações seguem as diretrizes da Norma Brasileira NBR 8800:2008.
 */

export function calculateProfile(profile, loads, material) {
  // Extração das solicitações informadas pelo usuário
  const Mxsd = parseFloat(loads.Mxsd) || 0; // Momento fletor solicitante em X (kN.m)
  const Mysd = parseFloat(loads.Mysd) || 0; // Momento fletor solicitante em Y (kN.m)
  const Vxsd = parseFloat(loads.Vxsd) || 0; // Esforço cortante em X (kN)
  const Vysd = parseFloat(loads.Vysd) || 0; // Esforço cortante em Y (kN)
  const Nsd = parseFloat(loads.Nsd) || 0;   // Esforço normal (positivo = tração, negativo = compressão) (kN)
  
  // Comprimentos de flambagem
  const Lb = parseFloat(loads.Lb) || 160;   // Comprimento destravado para flambagem lateral (cm)
  const Lx = parseFloat(loads.Lx) || Lb;    // Comprimento de flambagem em X (cm)
  const Ly = parseFloat(loads.Ly) || Lb;    // Comprimento de flambagem em Y (cm)

  // Propriedades do material (Aço)
  const fy = material.fy;                   // Tensão de escoamento (MPa)
  const E = material.E;                     // Módulo de elasticidade (MPa)
  const gamma_a1 = material.gamma_a1;       // Coeficiente de minoração da resistência ao escoamento
  const Kv = material.Kv;                   // Parâmetro de flambagem por cisalhamento (normalmente 5.34 para almas sem enrijecedores)

  // Extração das propriedades geométricas do perfil em avaliação
  const {
    d, bf, tw, tf, h, d_linha, Area,
    Ix, Wx, rx, Zx,
    Iy, Wy, ry, Zy,
    It, Cw
  } = profile;

  const realCw = Cw; 
  const results = {};

  // ============================================================================
  // 1. MÓDULOS PLÁSTICOS MÍNIMOS REQUERIDOS (Zx e Zy)
  // Transforma Mxsd/Mysd de kN.m para kN.cm multiplicando por 100.
  // ============================================================================
  const Zx_min = (Mxsd * 100 * gamma_a1) / (fy / 10);
  results.Zx_min = Zx_min;
  
  const Zy_min = (Mysd * 100 * gamma_a1) / (fy / 10);
  results.Zy_min = Zy_min;

  // ============================================================================
  // 2. CAPACIDADE MÁXIMA RELATIVA AO MOMENTO (Mrd_max)
  // Limita o momento fletor resistente ao escoamento da seção (limite plástico).
  // ============================================================================
  const Mrd_max_cm = (1.5 * Wx * (fy / 10)) / gamma_a1;
  const Mrd_max = Mrd_max_cm / 100; // Converte de kN.cm para kN.m
  results.Mrd_max_cm = Mrd_max_cm;
  results.Mrd_max = Mrd_max;

  // ============================================================================
  // 3. CLASSIFICAÇÃO DA ALMA DO PERFIL (Esbeltez)
  // Determina se a alma sofrerá flambagem local antes do escoamento.
  // ============================================================================
  const class_lambda = d_linha / tw;
  const class_lambda_r = 5.7 * Math.sqrt(E / fy);
  const esbelto = class_lambda <= class_lambda_r ? 'Não' : 'Sim';
  results.Classificacao = {
    lambda: class_lambda,
    lambda_r: class_lambda_r,
    esbelto
  };

  // ============================================================================
  // 4. VERIFICAÇÕES À FLEXÃO NO EIXO FORTE (X)
  // ============================================================================
  
  // 4.1 FLAMBAGEM LATERAL COM TORÇÃO (FLT)
  // Atualizado para a NBR 8800:2024 (Método da Esbeltez Relativa - Item D.2.1)
  const Cb = 1; // Coeficiente de momento uniforme (conservador)
  const Mpl_FLT_cm = (fy / 10) * Zx;
  
  // Cálculo do Momento Crítico Elástico (Mcr)
  const Mrc_cm = (Cb * Math.pow(Math.PI, 2) * (E / 10) * Iy / Math.pow(Lb, 2)) * Math.sqrt((realCw / Iy) * (1 + 0.039 * (It * Math.pow(Lb, 2)) / realCw));

  // Esbeltez Relativa para FLT (lambda_LT)
  const lambda_LT = Math.sqrt(Mpl_FLT_cm / Mrc_cm);

  let Mrd_FLT_cm = 0;
  if (lambda_LT <= 0.40) {
    // Curva patamar (Plástico)
    Mrd_FLT_cm = Mpl_FLT_cm / gamma_a1;
  } else if (lambda_LT > 0.40 && lambda_LT <= 1.40) {
    // Regime Inelástico
    Mrd_FLT_cm = (1 - 0.49 * (lambda_LT - 0.40)) * Mpl_FLT_cm / gamma_a1;
  } else {
    // Regime Elástico
    Mrd_FLT_cm = Mpl_FLT_cm / (gamma_a1 * Math.pow(lambda_LT, 2));
  }
  
  let Mrd_FLT = Mrd_FLT_cm / 100;
  if (Mrd_FLT > Mrd_max) Mrd_FLT = Mrd_max; // Limitador superior normativo

  results.FLT = {
    Cb, Mpl: Mpl_FLT_cm, Mrc: Mrc_cm,
    lambda_LT: lambda_LT, 
    Mrd: Mrd_FLT,
    pass: Mrd_FLT >= Mxsd
  };

  // 4.2 FLAMBAGEM LOCAL DA MESA (FLM)
  // Instabilidade local da mesa na região comprimida.
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

  // 4.3 FLAMBAGEM LOCAL DA ALMA (FLA)
  // Instabilidade local da alma na região comprimida por flexão.
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
    Mrd_FLA_cm = 0; // Alma excessivamente esbelta (tratamento não abordado aqui)
  }
  
  let Mrd_FLA = Mrd_FLA_cm / 100;
  if (Mrd_FLA > Mrd_max && Mrd_FLA !== 0) Mrd_FLA = Mrd_max;

  results.FLA = {
    Mpl: Mpl_FLA_cm, Mr: Mr_FLA_cm,
    lambda: lambda_FLA, lambda_p: lambda_p_FLA, lambda_r: lambda_r_FLA,
    Mrd: Mrd_FLA,
    pass: Mrd_FLA >= Mxsd
  };

  // ============================================================================
  // 5. VERIFICAÇÕES AO CISALHAMENTO
  // ============================================================================
  
  // 5.1 CISALHAMENTO NO EIXO Y (Alma resistindo)
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

  // 5.2 CISALHAMENTO NO EIXO X (Mesas resistindo)
  // Conforme NBR 8800 item 5.4.3.1.2 e 5.4.3.1.3, para seções retangulares plenas (mesas),
  // o valor de lambda não é aplicável, logo a resistência é sempre o Vpl da mesa / gamma_a1.
  const Aw_x = 2 * bf * tf;
  const Vpl_x = 0.6 * Aw_x * (fy / 10);
  const lambda_p_Vx = 1.1 * Math.sqrt((1.2 * E) / fy);
  const lambda_r_Vx = 1.37 * Math.sqrt((1.2 * E) / fy);

  const Vrd_x = Vpl_x / gamma_a1;

  results.ShearX = {
    Vrd: Vrd_x,
    pass: Vrd_x >= Vxsd
  };

  // ============================================================================
  // 6. FLEXÃO NO EIXO FRACO (Y)
  // Momento resistente à flambagem da mesa no eixo Y.
  // ============================================================================
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

  // ============================================================================
  // 7. ESFORÇO AXIAL: TRAÇÃO
  // ============================================================================
  const NtRd = (Area * (fy / 10)) / gamma_a1; // Capacidade no escoamento bruto (kN)
  const isTension = Nsd > 0;

  results.Tension = {
    NtRd,
    pass: isTension ? (NtRd >= Math.abs(Nsd)) : true
  };

  // ============================================================================
  // 8. ESFORÇO AXIAL: COMPRESSÃO (Flambagem Global e Local)
  // ============================================================================
  
  // 8.1 Flambagem Global
  const G_val = 7700; // Constante de rigidez à torção do aço (kN/cm²)
  
  const Nex = (Math.pow(Math.PI, 2) * (E / 10) * Ix) / Math.pow(Lx, 2);
  const Ney = (Math.pow(Math.PI, 2) * (E / 10) * Iy) / Math.pow(Ly, 2);
  const r0_squared = Math.pow(rx, 2) + Math.pow(ry, 2);
  const Lz = Ly; 
  const Nez = ((Math.pow(Math.PI, 2) * (E / 10) * realCw) / Math.pow(Lz, 2) + G_val * It) / r0_squared;
  
  const Ne = Math.min(Nex, Ney, Nez);
  const lambda0 = Math.sqrt((Area * (fy / 10)) / Ne);
  
  let chi = 1;
  if (lambda0 <= 1.5) {
    chi = Math.pow(0.658, Math.pow(lambda0, 2));
  } else {
    chi = 0.877 / Math.pow(lambda0, 2);
  }

  // 8.2 Flambagem Local (Determinação da Área Efetiva Aef)
  const b_AL = bf / 2;
  const t_AL = tf;
  const bt_AL = b_AL / t_AL;
  const bt_lim_AL = 0.56 * Math.sqrt(E / fy);
  const c1_AL = 0.22;
  const c2_AL = 1.49;
  const sigma_el_AL = Math.pow(c2_AL * (bt_lim_AL / bt_AL), 2) * fy;
  const lambda_AL = bt_lim_AL / Math.sqrt(chi);
  
  let bef_AL = b_AL;
  if (bt_AL > lambda_AL || bt_AL > bt_lim_AL) { 
    bef_AL = b_AL * (1 - c1_AL * Math.sqrt(sigma_el_AL / (chi * fy))) * Math.sqrt(sigma_el_AL / (chi * fy));
    if (bef_AL > b_AL) bef_AL = b_AL;
  }

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

  const NcRd = (chi * Aef * (fy / 10)) / gamma_a1;
  const isCompression = Nsd < 0;

  results.Compression = {
    Nex, Ney, Nez, Ne, lambda0, chi, r0_squared,
    AL: { b: b_AL, t: t_AL, bt: bt_AL, bt_lim: bt_lim_AL, c1: c1_AL, c2: c2_AL, sigma_el: sigma_el_AL, lambda_lim: lambda_AL, bef: bef_AL },
    AA: { b: b_AA, t: t_AA, bt: bt_AA, bt_lim: bt_lim_AA, c1: c1_AA, c2: c2_AA, sigma_el: sigma_el_AA, lambda_lim: lambda_AA, bef: bef_AA },
    Aef, NcRd,
    pass: isCompression ? (NcRd >= Math.abs(Nsd)) : true
  };

  // ============================================================================
  // 9. ESFORÇOS COMBINADOS (Interação Flexo-Compressão ou Flexo-Tração)
  // ============================================================================
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

  // Avaliação Global: só passa se todas as verificações individuais passarem
  results.min_Mrd = Mrdx;
  results.overallPass = results.FLT.pass && results.FLM.pass && results.FLA.pass && results.BendingY.pass && results.Shear.pass && results.ShearX.pass && results.Tension.pass && results.Compression.pass && results.Combined.pass;

  return results;
}
