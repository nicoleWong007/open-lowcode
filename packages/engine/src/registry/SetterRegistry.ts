import type { PropSchema } from '../schema/types';

type SetterComponent = React.ComponentType<{
  value: any;
  onChange: (value: any) => void;
  schema: PropSchema;
}>;

const TYPE_TO_SETTER: Record<string, string> = {
  string: 'Input',
  number: 'NumberInput',
  boolean: 'Switch',
  select: 'Select',
  color: 'ColorPicker',
  json: 'JSONEditor',
  expression: 'ExpressionEditor',
};

export class SetterRegistry {
  private setters = new Map<string, SetterComponent>();

  register(name: string, component: SetterComponent): void {
    this.setters.set(name, component);
  }

  get(name: string): SetterComponent | undefined {
    return this.setters.get(name);
  }

  resolve(schema: PropSchema): SetterComponent | undefined {
    const setterName = schema.setter ?? TYPE_TO_SETTER[schema.type];
    return setterName ? this.setters.get(setterName) : undefined;
  }
}
