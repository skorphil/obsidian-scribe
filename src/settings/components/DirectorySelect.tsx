import useSettingsForm from '../hooks/useSettingsForm';
import { usePlugin } from '../provider/SettingsFormProvider';
import { OBSIDIAN_PATHS, type ScribePluginSettings } from '../settings';
import { SettingsSelect } from './SettingsControl';

interface DirectorySelectProps<K extends keyof ScribePluginSettings> {
  id: K;
  name: string;
  description?: string;
}

/**
 * Settings select input for selecting directories
 */
function DirectorySelect<K extends keyof ScribePluginSettings>({
  id,
  name,
  description,
}: DirectorySelectProps<K>) {
  const { register } = useSettingsForm();
  const plugin = usePlugin();

  const foldersInVault = plugin.app.vault.getAllFolders();
  const directoriesMapping = [
    {
      displayName: 'Vault folder',
      value: '',
    },
    {
      displayName: 'Obsidian note folder',
      value: OBSIDIAN_PATHS.noteFolder,
    },
    ...foldersInVault.map((folder) => {
      const folderName = folder.path === '' ? 'Vault Folder' : folder.path;
      return {
        displayName: folderName,
        value: folder.path,
      };
    }),
  ];

  return (
    <SettingsSelect
      {...register(id)}
      name={name}
      description={description}
      valuesMapping={directoriesMapping}
    />
  );
}

export default DirectorySelect;
