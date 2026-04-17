import { Table as AntTable } from 'antd';
import type { CSSProperties } from 'react';

export interface TableComponentProps {
  columns?: string;
  data?: string;
  size?: 'small' | 'middle' | 'large';
  bordered?: boolean;
  style?: CSSProperties;
}

export const TableComponent: React.FC<TableComponentProps> = ({
  columns = '名称,值,状态',
  data = '项目1,100,正常;项目2,200,正常',
  size = 'small',
  bordered = true,
  style,
}) => {
  const cols = columns.split(',').map((c, i) => ({
    title: c.trim(),
    dataIndex: `col_${i}`,
    key: `col_${i}`,
  }));

  const rows = data.split(';').map((row, i) => {
    const cells = row.split(',').map((c) => c.trim());
    const record: Record<string, string> = { key: String(i) };
    cols.forEach((_, ci) => {
      record[`col_${ci}`] = cells[ci] ?? '';
    });
    return record;
  });

  return (
    <AntTable
      columns={cols}
      dataSource={rows}
      size={size}
      bordered={bordered}
      pagination={false}
      style={style}
    />
  );
};
