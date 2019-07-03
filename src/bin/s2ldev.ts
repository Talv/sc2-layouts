import * as fs from 'fs-extra';
import * as path from 'path';
import { createRegistryFromDir, DefinitionMap, readSchemaDataDir } from '../schema/registry';
import { getMdFilenameOfType, defTypeToMdFile, writeMdFile, readMdFile } from '../schema/localization';
import * as sch from '../schema/base';
import { dlog } from '../common';

// ===
// doc files

async function updateDocOfType(sDir: string, cType: sch.AbstractModel) {
    const mdFile = defTypeToMdFile(cType);
    const fullFilename = path.join(sDir, 'doc', getMdFilenameOfType(cType));
    await fs.ensureFile(fullFilename);
    await fs.writeFile(fullFilename, writeMdFile(mdFile));
}

async function updateDocFiles(sDir: string) {
    const schemaRegistry = await createRegistryFromDir(sDir);

    for (const cKind in schemaRegistry.catalog) {
        outer: for (const cType of (<DefinitionMap<sch.AbstractModel>>(<any>schemaRegistry.catalog)[cKind]).values()) {
            switch (cType.smKind) {
                case sch.ModelKind.SimpleType:
                case sch.ModelKind.ComplexType:
                {
                    if ((<sch.SimpleType | sch.ComplexType>cType).flags & sch.CommonTypeFlags.Virtual) {
                        continue outer;
                    }
                    break;
                }
            }
            console.log(getMdFilenameOfType(cType));
            await updateDocOfType(sDir, cType);
        }
    }
}

// ===
// schema cache

async function cacheSchema(sDir: string, targetFilename: string) {
    const sData = await readSchemaDataDir(sDir, { includeLocalization: false });
    await fs.ensureFile(targetFilename);
    await fs.writeJSON(targetFilename, sData);
}

// ===
// hookups

interface HookupEntry {
    type: string;
    name: string;
}

interface Hookup {
    fclass: string;
    children: HookupEntry[];
}

async function applyHookups(srcList: string, srcFrmType: string) {
    const hookups: Hookup[] = await fs.readJSON(srcList);
    let frmTypeXML = await fs.readFile(srcFrmType, 'utf8');

    function appendChunk(currentHookup: Hookup) {
        const frameName = currentHookup.fclass.substr(1);
        const rawXMLHookups: string[] = [];
        for (const entry of currentHookup.children) {
            rawXMLHookups.push(' '.repeat(8) + `<hookup path="${entry.name}" class="${entry.type}" required="true"/>`);
        }
        let offset = frmTypeXML.indexOf(`<frameType name="${frameName}"`);
        if (offset === -1) {
            console.error(`frameType element for "${frameName}" not found`);
            return;
        }
        offset = frmTypeXML.indexOf('>', offset) + 1;
        frmTypeXML = frmTypeXML.substr(0, offset) + '\n' + rawXMLHookups.join('\n') + frmTypeXML.substr(offset);
    }

    for (const currentHookup of hookups) {
        appendChunk(currentHookup)
    }

    process.stdout.write(frmTypeXML);
}

// ===
// run

if (process.argv.length < 3) process.exit(1);

switch (process.argv[2]) {
    case 'doc':
    {
        if (process.argv.length < 4) process.exit(1);
        updateDocFiles(process.argv[3]);
        break;
    }

    case 'cache':
    {
        if (process.argv.length < 5) process.exit(1);
        cacheSchema(process.argv[3], process.argv[4]);
        break;
    }

    case 'hookups':
    {
        if (process.argv.length < 5) process.exit(1);
        applyHookups(process.argv[3], process.argv[4]);
        break;
    }
}
