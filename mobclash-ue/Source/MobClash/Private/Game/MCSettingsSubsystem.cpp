#include "Game/MCSettingsSubsystem.h"

#include "Game/MCSettingsSaveGame.h"
#include "Kismet/GameplayStatics.h"

void UMCSettingsSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	LoadSettings();
}

void UMCSettingsSubsystem::Deinitialize()
{
	SettingsSaveGame = nullptr;
	Super::Deinitialize();
}

FMCPlayerSettingsData UMCSettingsSubsystem::GetSettings() const
{
	return RuntimeSettings;
}

void UMCSettingsSubsystem::SetSettings(const FMCPlayerSettingsData& InSettings, bool bSaveImmediately)
{
	RuntimeSettings = InSettings;
	ApplyRuntimeSettingsStubs();

	if (bSaveImmediately)
	{
		SaveSettings();
	}
}

bool UMCSettingsSubsystem::LoadSettings()
{
	if (!HasSavedSettings())
	{
		EnsureSaveGameObject();
		SettingsSaveGame->Settings = RuntimeSettings;
		ApplyRuntimeSettingsStubs();
		return SaveSettings();
	}

	USaveGame* LoadedObject = UGameplayStatics::LoadGameFromSlot(SaveSlotName, SaveUserIndex);
	SettingsSaveGame = Cast<UMCSettingsSaveGame>(LoadedObject);
	if (!SettingsSaveGame)
	{
		UE_LOG(LogTemp, Warning, TEXT("MCSettingsSubsystem: Failed to load %s save object."), *SaveSlotName);
		return false;
	}

	RuntimeSettings = SettingsSaveGame->Settings;
	ApplyRuntimeSettingsStubs();
	return true;
}

bool UMCSettingsSubsystem::SaveSettings()
{
	EnsureSaveGameObject();
	SettingsSaveGame->Settings = RuntimeSettings;

	const bool bSaved = UGameplayStatics::SaveGameToSlot(SettingsSaveGame, SaveSlotName, SaveUserIndex);
	if (!bSaved)
	{
		UE_LOG(LogTemp, Warning, TEXT("MCSettingsSubsystem: Failed to save %s."), *SaveSlotName);
	}

	return bSaved;
}

bool UMCSettingsSubsystem::HasSavedSettings() const
{
	return UGameplayStatics::DoesSaveGameExist(SaveSlotName, SaveUserIndex);
}

void UMCSettingsSubsystem::EnsureSaveGameObject()
{
	if (!SettingsSaveGame)
	{
		SettingsSaveGame = Cast<UMCSettingsSaveGame>(UGameplayStatics::CreateSaveGameObject(UMCSettingsSaveGame::StaticClass()));
	}
}

void UMCSettingsSubsystem::ApplyRuntimeSettingsStubs() const
{
	// PM3-DEV3: runtime hook point for future user settings application.
	// This is intentionally a no-op stub for now, but confirms values are loaded before menu interaction.
}
