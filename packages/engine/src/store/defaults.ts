import type { DocumentSchema } from '../schema/types';
import { generateId } from '@open-lowcode/shared';

export function createDefaultDocument(name = '未命名文档'): DocumentSchema {
  return {
    version: '1.0.0',
    id: generateId(),
    canvas: {
      width: 800,
      backgroundColor: '#ffffff',
    },
    root: {
      id: generateId(),
      type: 'Box',
      props: {},
      style: {
        minHeight: 400,
        padding: 16,
      },
      children: [],
    },
    variables: [],
    dataSources: [],
    eventBus: { listeners: [] },
    meta: {
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}
