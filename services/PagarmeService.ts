import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// Resolve o caminho corretamente mesmo em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Força a leitura do .env a partir da raiz do projeto
config({ path: path.resolve(__dirname, '../../.env') });

const API_URL = 'https://api.pagar.me/1';
const API_KEY = process.env.PAGARME_API_KEY;
const ID_RECEBEDOR = process.env.ID_RECEBEDOR;


export class PagarmeService {

    static async criarRecipient(data: {
        banco: string;
        agencia: string;
        conta: string;
        tipoDocumento: string;
        cpf_cnpj: string;
        nome: string;
        tipoConta: string;
    }) {
        const payload = {
            api_key: API_KEY,
            instant_transfer_enabled: false,
            automatic_anticipation_enabled: false,
            transfer_enabled: false,
            transfer_interval: 'daily',
            bank_account: {
                bank_code: data.banco,
                agencia: data.agencia,
                conta: data.conta.slice(0, -1),
                conta_dv: data.conta.slice(-1),
                document_type: data.tipoDocumento.toUpperCase(), // 'CPF' ou 'CNPJ'
                document_number: data.cpf_cnpj.replace(/\D/g, ''),
                legal_name: data.nome,
                type: data.tipoConta,
            }
        };

        const response = await axios.post(`${API_URL}/recipients`, payload);
        return response.data;
    }

    static async atualizarContaBancariaDoRecebedor(data: {
        recipient_id: string;
        banco: string;
        agencia: string;
        conta: string;
        tipoDocumento: string;
        cpf_cnpj: string;
        nome: string;
        tipoConta: string;
    }) {

        const payload = {
            api_key: API_KEY,
            bank_account: {
                bank_code: data.banco,
                agencia: data.agencia,
                conta: data.conta.slice(0, -1),
                conta_dv: data.conta.slice(-1),
                document_type: data.tipoDocumento.toUpperCase(), // CPF ou CNPJ
                document_number: data.cpf_cnpj.replace(/\D/g, ''), // remove pontos/tracinhos
                legal_name: data.nome.trim(),
                type: data.tipoConta, // conta_corrente, etc.
            }
        };

        try {
            const response = await axios.put(
                `${API_URL}/recipients/${data.recipient_id}`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
            return response.data;

        } catch (error: any) {
            const errors = error?.response?.data?.errors;

            if (Array.isArray(errors)) {
                console.log('🛑 Erros da API Pagar.me:');
                // errors.forEach((e: any, index: number) => {
                //     console.log(`  ${index + 1}. ${JSON.stringify(e, null, 2)}`);
                // });

                return {
                    success: false,
                    message: errors[0]?.message || 'Erro desconhecido na API Pagar.me',
                    type: errors[0]?.type,
                    parameter: errors[0]?.parameter_name,
                };
            } else {
                console.log('❗Erro inesperado:', error?.response?.data || error?.message);
            }

        }
    }

    static async criarTransacaoPixComSplit(data: {
        valor: number;
        nome: string;
        cpf_cnpj: string;
        ddd: string;
        celular: string;
        email?: string;
        idrecebedor: string;
        pix_expiration_date: string;
    }) {
        const payload = {
            api_key: API_KEY,
            payment_method: 'pix',
            amount: data.valor,
            pix_expiration_date: data.pix_expiration_date,
            customer: {
                email: data.email || 'no-reply@example.com', // fallback se email for ausente
                name: data.nome,
                document_number: data.cpf_cnpj.replace(/\D/g, ''), // limpa pontos e traços
                phone: {
                    number: data.celular.replace(/\D/g, ''),
                    ddd: data.ddd.replace(/\D/g, ''),
                },
            },
            capture: true,
            async: true,
            postback_url: "https://api.amigomontador.com/webhook/pagarme",
            split_rules: [
                {
                    recipient_id: ID_RECEBEDOR, // valor fixo da sua plataforma
                    percentage: '10',
                    liable: true,
                    charge_processing_fee: true,
                },
                {
                    recipient_id: data.idrecebedor,
                    percentage: '90',
                    liable: true,
                    charge_processing_fee: true,
                },
            ],
        };

        try {
            const response = await axios.post(`${API_URL}/transactions`, payload);
            return response.data;
        } catch (error: any) {
            const errors = error?.response?.data?.errors;

            if (Array.isArray(errors)) {
                console.log('🛑 Erros da API Pagar.me:');
                errors.forEach((e: any, i: number) =>
                    console.log(`  ${i + 1}. ${e.message} (${e.parameter_name})`)
                );

                return {
                    success: false,
                    message: errors[0]?.message || 'Erro desconhecido na API Pagar.me',
                    type: errors[0]?.type,
                    parameter: errors[0]?.parameter_name,
                };
            } else {
                console.error('❗Erro inesperado:', error?.response?.data || error?.message);
                return {
                    success: false,
                    message: 'Erro inesperado ao criar transação',
                };
            }
        }
    }

    static async consultaTransacaoPix(data: {
        id_transacao: string;
    }) {
        const response = await axios.get(
            `https://api.pagar.me/1/transactions/${data.id_transacao}`,
            {
                params: {
                    api_key: API_KEY, // ou 'sua_api_key'
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        return response.data;
    }

    static async estornar(data: {
        transaction_id: string;
        amount: number;
        bank_code: string;
        agencia: string;
        conta: string;
        conta_dv: string;
        document_type: 'CPF' | 'CNPJ';
        document_number: string;
        legal_name: string;
    }) {
        const payload = {
            api_key: API_KEY,
            amount: data.amount,
            bank_account: {
                bank_code: data.bank_code,
                agencia: data.agencia,
                conta: data.conta,
                conta_dv: data.conta_dv,
                document_type: data.document_type,
                document_number: data.document_number,
                legal_name: data.legal_name
            }
        };

        const response = await axios.post(
            `${API_URL}/transactions/${data.transaction_id}/refund`,
            payload
        );

        return response.data;
    }

    static async transferirParaMontador(params: {
        recipient_id: string;
        amount: number;
        status: boolean;
    }) {
        // Atualiza o recebedor (se necessário)
        await axios.put(`${API_URL}/recipients/${params.recipient_id}`, {
            api_key: API_KEY,
            transfer_enabled: params.status,
        });

        // Realiza a transferência manual
        const transferResponse = await axios.post(`${API_URL}/transfers`, {
            api_key: API_KEY,
            recipient_id: params.recipient_id,
            amount: params.amount,
        });

        return transferResponse.data;
    }

    static async fecharRecebedorMontador(params: {
        recipient_id: string;
        status: boolean;
    }) {
        try {
            // Atualiza o recebedor (se necessário)
            const res = await axios.put(`${API_URL}/recipients/${params.recipient_id}`, {
                api_key: API_KEY,
                transfer_enabled: params.status,
            });

            // // Realiza a transferência manual
            // const transferResponse = await axios.post(`${API_URL}/transfers`, {
            //     api_key: API_KEY,
            //     recipient_id: params.recipient_id,
            // });

            return res;
        } catch (error: any) {
            const errors = error?.response?.data?.errors;

            if (Array.isArray(errors)) {
                console.log('🛑 Erros da API Pagar.me:');
                errors.forEach((e: any, i: number) =>
                    console.log(`  ${i + 1}. ${e.message} (${e.parameter_name})`)
                );

                return {
                    success: false,
                    message: errors[0]?.message || 'Erro desconhecido na API Pagar.me',
                    type: errors[0]?.type,
                    parameter: errors[0]?.parameter_name,
                };
            } else {
                console.error('❗Erro inesperado:', error?.response?.data || error?.message);
                return {
                    success: false,
                    message: 'Erro inesperado ao criar transação',
                };
            }
        }

    }

}
