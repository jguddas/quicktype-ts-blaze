import {
  Namer,
  Name,
  TypeKind,
  PrimitiveType,
  ClassProperty,
  ObjectType,
  Type,
  panic,
  matchType,
  Sourcelike,
  Option,
  TargetLanguage,
  ConvenienceRenderer,
  RenderContext,
} from "quicktype-core";
import { convertersOption } from 'quicktype-core/dist/support/Converters'
import { StringTypeMapping, getNoStringTypeMapping } from 'quicktype-core/dist/TypeBuilder'
import { utf16StringEscape } from "quicktype-core/dist/support/Strings"
import { funPrefixNamer } from 'quicktype-core/dist/Naming'
import { arrayIntercalate } from 'collection-utils'
import toposort from 'toposort'

export const tsBlazeOptions = {
  converters: convertersOption(),
};

export class TsBlazeTargetLanguage extends TargetLanguage {
  protected getOptions(): Option<any>[] {
      return [tsBlazeOptions.converters];
  }
  // @ts-ignore
  get stringTypeMapping(): StringTypeMapping {
      return getNoStringTypeMapping();
  }
  // @ts-ignore
  get supportsOptionalClassProperties(): boolean {
      return true;
  }
  // @ts-ignore
  get supportsFullObjectType(): boolean {
      return true;
  }
  constructor(
    displayName: string = "TsBlaze",
    names: string[] = ["tsBlaze"],
    extension: string = "tsBlaze"
  ) {
    super(displayName, names, extension);
  }
  protected makeRenderer(renderContext: RenderContext):TsBlazeRenderer {
    return new TsBlazeRenderer(this, renderContext);
  }
}
class TsBlazeRenderer extends ConvenienceRenderer {
  nameStyle(name:string):string { return `is_${name}`.replace(/_+./g,x => x.slice(-1).toUpperCase()) }
  namerForObjectProperty():Namer { return funPrefixNamer("properties", this.nameStyle) }
  makeUnionMemberNamer():Namer { return funPrefixNamer("union-member", this.nameStyle) }
  makeNamedTypeNamer():Namer { return funPrefixNamer("types", this.nameStyle) }
  makeEnumCaseNamer():Namer { return funPrefixNamer("enum-cases", (s) => s) }
  typeMapTypeFor(t:Type):Sourcelike {
    if (["class", "object", "enum"].indexOf(t.kind) >= 0) {
      return [this.nameForNamedType(t)];
    }

    const match = matchType<Sourcelike>(
      t,
      (_anyType) => "_any()",
      (_nullType) => "_null()",
      (_boolType) => "_boolean()",
      (_integerType) => "_number()",
      (_doubleType) => "_number()",
      (_stringType) => "_string()",
      (arrayType) => ["_array(", this.typeMapTypeFor(arrayType.items), ")"],
      (_classType) => panic("Should already be handled."),
      (_mapType) => panic("Maptype is not supported."),
      (_enumType) => panic("Should already be handled."),
      (unionType) => {
        const children = Array.from(unionType.getChildren()).map((type: Type) =>
          this.typeMapTypeFor(type)
        );
        return ["_oneOf([ ", ...arrayIntercalate(", ", children), " ])"];
      },
      (_transformedStringType) => {
        return `_string().satisfies(${this.nameStyle(_transformedStringType.kind.replace('-','_'))})`;
      }
    );

    return match;
  }
  typeMapTypeForProperty(p: ClassProperty): Sourcelike {
    if (p.isOptional) {
      return ["_oneOf([ ", this.typeMapTypeFor(p.type), ", _undefined() ])"]
    }
    return this.typeMapTypeFor(p.type);
  }
  private emitObject(name: Name, t: ObjectType) {
    this.ensureBlankLine();
    this.emitLine("export const ", name, " = _object({");
    this.indent(() => {
      this.forEachClassProperty(t, "none", (_, jsonName, property) => {
        this.emitLine(`"${utf16StringEscape(jsonName)}"`, ": ", this.typeMapTypeForProperty(property), ",");
      });
    });
    this.emitLine("});");
  }
  private emitExport(name: Sourcelike, value: Sourcelike): void {
    this.emitLine("export const ", name, " = ", value, ";");
  }
  needsTransformerForType(): boolean {
      return false;
  }
  forEachUniqType = (fn:(t:TypeKind)=>void) => {
    const firstUnionByValue = new Map<TypeKind, boolean>();
    this.forEachType((t) => {
      if (!firstUnionByValue.has(t.kind)) {
        fn(t.kind)
        firstUnionByValue.set(t.kind, true);
      }
    })
  }
  emitSourceStructure() {
    const tsBlazeImports:string[] = []
    this.forEachUniqType(( kind ) => {
      if (kind === 'class') {
        tsBlazeImports.push("object as _object")
      } else if (kind === 'integer') {
        tsBlazeImports.push("number as _number")
      } else if (kind === 'bool') {
        tsBlazeImports.push("boolean as _boolean")
      } else if (kind === 'union') {
        tsBlazeImports.push("oneOf as _oneOf")
      } else if (['array', 'string', 'oneOf', 'boolean', 'null', 'any'].includes(kind)) {
        tsBlazeImports.push(kind + ' as _' + kind)
      }
    })
    if (this.haveOptionalProperties) {
      tsBlazeImports.push('undefined as _undefined')
    }
    if (tsBlazeImports.length) {
      if (tsBlazeImports.length < 5) {
        this.emitLine(["import { ", tsBlazeImports.join(', '), " } from 'ts-blaze';"])
      } else {
        this.emitLine("import {")
        this.indent(() => {
          tsBlazeImports.forEach((val, idx, arr) => {
            this.emitLine(idx === arr.length -1 ? val : [val, ","])
          })
        })
        this.emitLine("} from 'ts-blaze';")
      }
      this.ensureBlankLine()
    }

    const regexps:string[] = []
    const stringFns:string[] = []
    this.forEachUniqType(( kind ) => {
      switch (kind) {
        case 'date':
          regexps.push("const DATE_REGEXP = /^(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)$/;")
          stringFns.push("export const isDate = DATE_REGEXP.test.bind(DATE_REGEXP);")
          break
        case 'time':
          regexps.push("const TIME_REGEXP = /^(\\d\\d):(\\d\\d):(\\d\\d)(\\.\\d+)?(z|[+-]\\d\\d:\\d\\d)?$/i;")
          stringFns.push("export const isTime = TIME_REGEXP.test.bind(TIME_REGEXP);")
          break
        case 'date-time':
          regexps.push("const DATE_TIME_REGEXP = /^(\\d\\d\\d\\d)-(\\d\\d)-(\\d\\d)(t|\\s)(\\d\\d):(\\d\\d):(\\d\\d)(\\.\\d+)?(z|[+-]\\d\\d:\\d\\d)?$/i;")
          stringFns.push("export const isDateTime = DATE_TIME_REGEXP.test.bind(DATE_TIME_REGEXP);")
          break
        case 'bool-string':
          stringFns.push("export const isBoolString = (s) => s === 'true' || s === 'false';")
          break
        case 'uuid':
          regexps.push("const UUID_REGEXP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;")
          stringFns.push("export const isUuid = UUID_REGEXP.test.bind(UUID_REGEXP);")
          break
        case 'uri':
          regexps.push("const URI_REGEXP = /^(https?|ftp):\\/\\/[^{}]+$/;")
          stringFns.push("export const isUri = URI_REGEXP.test.bind(URI_REGEXP);")
          break
        case 'integer-string':
          regexps.push("const INTEGER_STRING_REGEXP = /^(0|-?[1-9]\\d*)$/;")
          stringFns.push("export const isIntegerString = INTEGER_STRING_REGEXP.test.bind(INTEGER_STRING_REGEXP);")
          break
      }
    })
    regexps.forEach((s) => this.emitLine(s))
    this.ensureBlankLine()
    stringFns.forEach((s) => this.emitLine(s))
    this.ensureBlankLine()

    this.forEachEnum("none", (enumType, enumName) => {
      const options: Sourcelike = [];
      this.forEachEnumCase(enumType, "none", (name: Name, _jsonName, _position) => {
        options.push("_string('");
        options.push(name);
        options.push("')");
        options.push(", ");
      });
      options.pop()

      this.emitLine(["export const ", enumName, " = _oneOf([ ", ...options, " ]);"]);
    });

    const mapKey: Name[] = [];
    const mapValue: Sourcelike[][] = [];
    const mapNames = (names?:Name|Name[]):Name[] => names instanceof Name
      ? [ names ]
      : names && names.filter
        ? names.map(mapNames).reduce((acc, val) => acc.concat(val), [])
        : []
    this.forEachObject("none", (type: ObjectType, name: Name) => {
      mapKey.push(name);
      mapValue.push(this.gatherSource(() => this.emitObject(name, type)));
    });
    toposort(
      mapKey.map((_, index) => {
        const source = mapValue[index];
        const names = mapNames(source as Name[]).slice(1)
        return names
          .map((val) => mapKey.findIndex(a => val === a))
          .filter(val => val > -1 && val !== index)
          .map((val):[number,number] => [ index, val ])
      }).reduce<[number,number][]>((acc, val) => acc.concat(val), []).concat([[ -1, 0 ]])
    ).reverse().forEach((i) => i >- 1 && this.emitGatheredSource(mapValue[i]))

    // now emit top levels
    this.forEachTopLevel("none", (type, name) => {
      if (type instanceof PrimitiveType) {
        this.emitExport(name, this.typeMapTypeFor(type));
        this.ensureBlankLine()
        this.emitLine("export default ", name, ';');
      } else if (type.kind === "array") {
        this.emitExport(name, ["_array(", this.typeMapTypeFor((type as any).items), ")"]);
      }
    });
  }
}

export default TsBlazeTargetLanguage
