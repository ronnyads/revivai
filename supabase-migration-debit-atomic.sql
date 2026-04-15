-- =============================================
-- reviv.ai — Migration: Atomic debit_credit
-- Corrige race condition: usa UPDATE com WHERE
-- condicional e RETURNING para detectar se o
-- crédito foi realmente debitado.
-- =============================================

-- Substitui a função original por versão atômica.
-- A versão anterior: fazia SELECT + UPDATE em dois passos
--   → vulnerável a race conditions (dois requests simultâneos
--     podiam debitar o mesmo crédito)
-- Esta versão: atômica. O UPDATE só aplica se credits > 0
--   e retorna o número de linhas afetadas.

create or replace function debit_credit(user_id_param uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  updated_rows integer;
begin
  update public.users
  set credits = credits - 1
  where id = user_id_param
    and credits > 0;  -- garante que só debita se há saldo

  get diagnostics updated_rows = row_count;

  -- Retorna true se o débito aconteceu, false se não havia crédito
  return updated_rows > 0;
end;
$$;

-- Comentário: Apesar de a função agora retornar boolean,
-- o código Typescript chama via .rpc() sem usar o retorno.
-- Isso é seguro — o comportamento de debitar apenas quando
-- credits > 0 já estava correto, só a atomicidade mudou.
-- Para verificar se o crédito foi debitado:
--   const { data } = await adminClient.rpc('debit_credit', { user_id_param: userId })
--   if (!data) throw new Error('Sem créditos')
