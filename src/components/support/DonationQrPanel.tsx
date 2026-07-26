'use client';

import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import styles from '@/app/support/support.module.css';

type Props = {
  displayToken: string;
  transferCode: string;
  bankBin: string;
  bankAccount: string;
  bankHolder: string;
};

const PRESETS = [20_000, 50_000, 100_000, 200_000];

function buildQrUrl(input: {
  transferCode: string;
  bankBin: string;
  bankAccount: string;
  bankHolder: string;
  amount: number;
}): string {
  const parameters = new URLSearchParams({
    acc: input.bankAccount,
    bank: input.bankBin,
    des: input.transferCode,
    template: 'compact',
    showinfo: 'true',
    fullacc: 'true',
    holder: input.bankHolder,
    store: 'MOD VIET HOA',
  });

  if (input.amount > 0) {
    parameters.set('amount', String(Math.round(input.amount)));
  }

  return `https://vietqr.app/img?${parameters.toString()}`;
}

export default function DonationQrPanel({
  displayToken,
  transferCode,
  bankBin,
  bankAccount,
  bankHolder,
}: Props) {
  const [amount, setAmount] = useState(100_000);
  const [copied, setCopied] = useState<
    'transferCode' | 'account' | null
  >(null);

  const qrUrl = useMemo(
    () =>
      buildQrUrl({
        transferCode,
        bankBin,
        bankAccount,
        bankHolder,
        amount,
      }),
    [
      amount,
      bankAccount,
      bankBin,
      bankHolder,
      transferCode,
    ],
  );

  async function copy(
    value: string,
    type: 'transferCode' | 'account',
  ) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1_600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className={styles.qrPanel}>
      <div className={styles.amountSelector}>
        <span>Chọn nhanh số tiền</span>
        <div className={styles.amountPresets}>
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={
                amount === preset ? styles.amountActive : ''
              }
              onClick={() => setAmount(preset)}
            >
              {new Intl.NumberFormat('vi-VN').format(preset)}đ
            </button>
          ))}
          <button
            type="button"
            className={amount === 0 ? styles.amountActive : ''}
            onClick={() => setAmount(0)}
          >
            Tự nhập
          </button>
        </div>
      </div>

      <div className={styles.qrImageWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`Mã QR ủng hộ với nội dung ${transferCode}`}
          className={styles.qrImage}
        />
      </div>

      <div className={styles.transferCode}>
        <span>Nội dung chuyển khoản riêng</span>
        <strong>{transferCode}</strong>
        <small>Mã định danh: {displayToken}</small>
        <button
          type="button"
          onClick={() =>
            void copy(transferCode, 'transferCode')
          }
        >
          {copied === 'transferCode' ? (
            <Check size={16} />
          ) : (
            <Copy size={16} />
          )}
          {copied === 'transferCode'
            ? 'Đã sao chép'
            : 'Sao chép mã'}
        </button>
      </div>

      <button
        type="button"
        className={styles.accountCopy}
        onClick={() => void copy(bankAccount, 'account')}
      >
        {copied === 'account' ? (
          <Check size={16} />
        ) : (
          <Copy size={16} />
        )}
        {copied === 'account'
          ? 'Đã sao chép số tài khoản'
          : 'Sao chép số tài khoản'}
      </button>
    </div>
  );
}
