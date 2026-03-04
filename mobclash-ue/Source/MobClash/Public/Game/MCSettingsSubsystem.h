#pragma once

#include "CoreMinimal.h"
#include "Data/MCSettingsData.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "MCSettingsSubsystem.generated.h"

class UMCSettingsSaveGame;

/**
 * Runtime owner for player settings persistence.
 * Loads once at startup and exposes save/load helpers for UI wiring.
 */
UCLASS()
class MOBCLASH_API UMCSettingsSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	UFUNCTION(BlueprintCallable, Category = "Settings")
	FMCPlayerSettingsData GetSettings() const;

	UFUNCTION(BlueprintCallable, Category = "Settings")
	void SetSettings(const FMCPlayerSettingsData& InSettings, bool bSaveImmediately = true);

	UFUNCTION(BlueprintCallable, Category = "Settings")
	bool LoadSettings();

	UFUNCTION(BlueprintCallable, Category = "Settings")
	bool SaveSettings();

	UFUNCTION(BlueprintCallable, Category = "Settings")
	bool HasSavedSettings() const;

private:
	void EnsureSaveGameObject();
	void ApplyRuntimeSettingsStubs() const;

	UPROPERTY(Transient)
	TObjectPtr<UMCSettingsSaveGame> SettingsSaveGame;

	UPROPERTY(VisibleAnywhere, Category = "Settings")
	FMCPlayerSettingsData RuntimeSettings;

	UPROPERTY(EditDefaultsOnly, Category = "Settings")
	FString SaveSlotName = TEXT("MC_PlayerSettings");

	UPROPERTY(EditDefaultsOnly, Category = "Settings")
	int32 SaveUserIndex = 0;
};
