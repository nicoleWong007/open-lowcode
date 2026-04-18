/** 代码导出产物的单个文件 */
export interface OutputFile {
  /** 相对路径，e.g. 'index.tsx', 'styles.module.css' */
  path: string;
  /** 文件内容 */
  content: string;
}

/** 代码导出结果 */
export interface CodegenResult {
  /** 组件名称（PascalCase） */
  componentName: string;
  /** 导出的文件列表 */
  files: OutputFile[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PropsTransformFn = (props: Record<string, any>) => Record<string, any>;

/** antd 组件映射信息 */
export interface ComponentMapping {
  tagName: string;
  importSource: string;
  importNames: string[];
  isContainer: boolean;
  transformProps: PropsTransformFn;
}
